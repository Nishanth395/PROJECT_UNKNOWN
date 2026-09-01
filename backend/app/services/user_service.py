import logging
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.db.models import User
from app.schemas.auth import AuthenticatedUser

logger = logging.getLogger("uvicorn.error")


class UserService:
    """Service layer for retrieving, syncing, and managing public.users profiles."""

    @staticmethod
    def get_user_by_id(db: Session, user_id: str | UUID) -> Optional[User]:
        """
        Retrieves a user profile from public.users using their UUID.
        The user_id MUST come from the verified JWT identity ('sub' claim).
        """
        if not user_id:
            return None

        if isinstance(user_id, str):
            try:
                user_id = UUID(user_id)
            except (ValueError, TypeError):
                return None

        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Retrieves a user profile from public.users by their email address."""
        if not email:
            return None
        return db.query(User).filter(User.email == email.lower().strip()).first()

    @staticmethod
    def get_or_create_user_from_auth(db: Session, auth_user: AuthenticatedUser) -> User:
        """
        Retrieves user from public.users or automatically provisions them from verified JWT claims.
        Ensures users registered through Supabase Auth seamlessly have a public.users profile.
        """
        existing = UserService.get_user_by_id(db, auth_user.user_id)
        if existing:
            return existing

        user_uuid = UUID(auth_user.user_id)
        meta = auth_user.user_metadata or {}
        full_name = meta.get("full_name") or auth_user.claims.get("name") or (auth_user.email.split("@")[0] if auth_user.email else "User")
        role_raw = meta.get("role") or auth_user.role or "customer"
        role = "worker" if role_raw == "worker" else "customer"
        phone = meta.get("phone")

        new_user = User(
            id=user_uuid,
            email=auth_user.email,
            full_name=full_name,
            role=role,
            phone=phone,
        )
        db.add(new_user)
        try:
            db.commit()
            db.refresh(new_user)
            logger.info("Auto-provisioned public.users profile for user %s (%s, role=%s)", user_uuid, auth_user.email, role)
            return new_user
        except Exception:
            db.rollback()
            # If concurrent insert happened, fetch and return
            existing = UserService.get_user_by_id(db, auth_user.user_id)
            if existing:
                return existing
            raise
