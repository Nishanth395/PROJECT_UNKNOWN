from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class AuthenticatedUser(BaseModel):
    """
    Typed user identity extracted directly from verified Supabase JWT claims.
    Never trusts client-provided identity parameters.
    """
    user_id: str = Field(description="Supabase Auth UUID ('sub' claim)")
    email: Optional[str] = Field(default=None, description="User email address from JWT claim")
    role: Optional[str] = Field(default=None, description="Supabase auth role claim")
    app_metadata: Dict[str, Any] = Field(default_factory=dict, description="Supabase app metadata")
    user_metadata: Dict[str, Any] = Field(default_factory=dict, description="Supabase user metadata")
    claims: Dict[str, Any] = Field(default_factory=dict, description="Full verified JWT claims dictionary")


class AuthMeResponse(BaseModel):
    """
    Safe user identity and profile response for /auth/me endpoint.
    Combines verified JWT identity with public.users profile state.
    """
    user_id: str
    email: Optional[str] = None
    role: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    profile_exists: bool = False
