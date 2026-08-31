from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.security import get_current_auth_user
from app.db.database import get_db
from app.schemas.auth import AuthenticatedUser, AuthMeResponse
from app.services.user_service import UserService

router = APIRouter(tags=["Authentication"])


@router.get(
    "/auth/me",
    response_model=AuthMeResponse,
    summary="Get Authenticated User Profile",
    description="Returns the authenticated user's verified JWT identity and public profile state.",
)
def get_auth_me(
    auth_user: AuthenticatedUser = Depends(get_current_auth_user),
    db: Session = Depends(get_db),
) -> AuthMeResponse:
    """
    Returns the identity of the user authenticated via Supabase JWT.
    If the user has a profile in public.users, includes full profile details.
    If no public.users profile exists yet, returns profile_exists=False.
    """
    db_user = UserService.get_user_by_id(db, auth_user.user_id)

    if not db_user:
        return AuthMeResponse(
            user_id=auth_user.user_id,
            email=auth_user.email,
            role=None,
            full_name=None,
            phone=None,
            avatar_url=None,
            profile_exists=False,
        )

    return AuthMeResponse(
        user_id=str(db_user.id),
        email=db_user.email or auth_user.email,
        role=db_user.role,
        full_name=db_user.full_name,
        phone=db_user.phone,
        avatar_url=db_user.avatar_url,
        profile_exists=True,
    )
