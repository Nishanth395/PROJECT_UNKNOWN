from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.db.models import User


class UserService:
    """Service layer for retrieving and managing public.users profiles."""

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
