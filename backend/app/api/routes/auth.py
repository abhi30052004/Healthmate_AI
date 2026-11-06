from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.rate_limit import auth_login_limiter, auth_register_limiter, password_reset_confirm_limiter, password_reset_limiter
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRead,
    UserRegister,
)
from app.services.password_reset import create_reset_token, reset_password, send_reset_email
from app.services.auth import issue_token_response, login_user, register_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
    dependencies=[Depends(auth_register_limiter)],
)
def register(
    register_data: UserRegister,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Register a new user with email, name, and password."""
    return register_user(db, register_data)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Log in and retrieve JWT access token",
    dependencies=[Depends(auth_login_limiter)],
)
def login(
    login_data: UserLogin,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    """Authenticate credentials and return a signed bearer access token."""
    return login_user(db, login_data)


@router.get(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Return the currently authenticated user's safe public profile."""
    return current_user


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Renew the access token for an active session",
)
def refresh(
    current_user: Annotated[User, Depends(get_current_user)],
) -> TokenResponse:
    """Issue a fresh short-lived access token for a still-valid session (sliding renewal)."""
    return issue_token_response(current_user)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Email a password reset link",
    dependencies=[Depends(password_reset_limiter)],
)
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    """Always answers the same way so the endpoint cannot be used to discover registered emails."""
    created = create_reset_token(db, payload.email)
    if created is not None:
        user, raw_token = created
        background_tasks.add_task(send_reset_email, user.email, user.name, raw_token)
    return MessageResponse(message="If an account exists for that email, a reset link is on its way.")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Set a new password using an emailed reset token",
    dependencies=[Depends(password_reset_confirm_limiter)],
)
def reset_password_route(
    payload: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    reset_password(db, payload.token, payload.new_password)
    return MessageResponse(message="Your password has been updated. You can now log in.")
