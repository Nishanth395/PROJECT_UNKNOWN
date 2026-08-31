import logging
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient, PyJWTError, ExpiredSignatureError, InvalidSignatureError, InvalidAudienceError, InvalidIssuerError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db.models import User
from app.schemas.auth import AuthenticatedUser
from app.services.user_service import UserService

logger = logging.getLogger("uvicorn.error")

# HTTP Bearer token extractor
security_scheme = HTTPBearer(auto_error=False)

# Cached JWKS client for asymmetric key verification
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> Optional[PyJWKClient]:
    """Returns or lazily initializes the PyJWKClient for asymmetric signing keys."""
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_URL:
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def verify_supabase_jwt(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency that extracts, verifies, and decodes Supabase JWTs.
    Validates signature, expiration, algorithm, and extracts the 'sub' identity.
    Never logs access tokens, keys, or secrets.
    """
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "MISSING_CREDENTIALS",
                "message": "Authorization header with Bearer token is required",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth_header.strip().lower().startswith("bearer ") or credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_AUTH_SCHEME",
                "message": "Authorization scheme must be Bearer",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()

    try:
        # 1. Inspect unverified header to determine signing algorithm
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")

        decode_options = {
            "verify_signature": True,
            "verify_exp": True,
            "verify_iat": True,
            "verify_aud": False,  # Checked below for flexibility
        }

        # 2. Decode and verify signature based on algorithm
        if alg in ("HS256", "HS384", "HS512"):
            if not settings.SUPABASE_JWT_SECRET:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "error_code": "CONFIG_ERROR",
                        "message": "Server JWT secret is not configured",
                    },
                )

            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[alg],
                options=decode_options,
            )

        elif alg in ("RS256", "RS384", "RS512", "ES256", "ES384", "ES512"):
            jwks_client = get_jwks_client()
            if not jwks_client:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "error_code": "CONFIG_ERROR",
                        "message": "Supabase URL is not configured for JWKS verification",
                    },
                )

            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options=decode_options,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error_code": "UNSUPPORTED_ALGORITHM",
                    "message": f"Unsupported JWT signing algorithm: {alg}",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "TOKEN_EXPIRED",
                "message": "JWT token has expired",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_SIGNATURE",
                "message": "Invalid JWT signature",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_AUDIENCE",
                "message": "Invalid JWT audience claim",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_ISSUER",
                "message": "Invalid JWT issuer claim",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    except PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_TOKEN",
                "message": f"Could not validate JWT: {str(e)}",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Validate audience if present
    aud = payload.get("aud")
    if aud is not None and aud not in ("authenticated", "project-unknown"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_AUDIENCE",
                "message": "Invalid JWT audience claim",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Validate subject ('sub') claim
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error_code": "INVALID_TOKEN",
                "message": "Token is missing subject 'sub' claim",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 5. Construct typed authenticated user object
    return AuthenticatedUser(
        user_id=str(user_id),
        email=payload.get("email"),
        role=payload.get("role"),
        app_metadata=payload.get("app_metadata", {}) or {},
        user_metadata=payload.get("user_metadata", {}) or {},
        claims=payload,
    )


def get_current_auth_user(
    auth_user: AuthenticatedUser = Depends(verify_supabase_jwt),
) -> AuthenticatedUser:
    """Dependency that returns the verified AuthenticatedUser from JWT claims."""
    return auth_user


def get_current_user(
    auth_user: AuthenticatedUser = Depends(get_current_auth_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that retrieves the user profile from public.users using the verified JWT user_id.
    Raises 404 if the user profile does not exist in public.users.
    """
    user = UserService.get_user_by_id(db, auth_user.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_code": "USER_PROFILE_NOT_FOUND",
                "message": "User profile not found in public.users",
            },
        )
    return user


def require_customer(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that verifies the current user has the 'customer' role in public.users.
    Raises 403 Forbidden if the user is not a customer.
    """
    if current_user.role != "customer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "FORBIDDEN",
                "message": "Access restricted to customer accounts only",
            },
        )
    return current_user


def require_worker(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that verifies the current user has the 'worker' role in public.users.
    Raises 403 Forbidden if the user is not a worker.
    """
    if current_user.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "FORBIDDEN",
                "message": "Access restricted to worker accounts only",
            },
        )
    return current_user
