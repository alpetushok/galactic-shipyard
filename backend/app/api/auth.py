# ═══════════════════════════════════════
#  API — Auth (JWT)
# ═══════════════════════════════════════

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os

from app.db.database import get_db, User, Order, PilotRank

router = APIRouter()

SECRET_KEY  = os.getenv("SECRET_KEY", "galactic-shipyard-secret-change-in-production")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_ctx      = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── SCHEMAS ──
class UserRegister(BaseModel):
    username: str
    email: str
    password: str


class UserOut(BaseModel):
    id:            int
    username:      str
    email:         str
    rank:          str
    credits_spent: float
    total_orders:  int = 0
    created_at:    datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type:   str
    user:         UserOut


# ── HELPERS ──
def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

async def _get_user_out(db: AsyncSession, user: User) -> UserOut:
    """Build UserOut with order count."""
    result = await db.execute(
        select(func.count()).where(Order.user_id == user.id)
    )
    total_orders = result.scalar() or 0
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        rank=user.rank,
        credits_spent=user.credits_spent,
        total_orders=total_orders,
        created_at=user.created_at,
    )

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid galactic credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload  = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id  = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise exc

    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise exc
    return user


# ── ROUTES ──
@router.post("/register", response_model=Token, status_code=201)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    # Validation
    if len(payload.username) < 3:
        raise HTTPException(400, "Username must be at least 3 characters")
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    # Check duplicates
    result = await db.execute(
        select(User).where(
            (User.username == payload.username) | (User.email == payload.email)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(400, "Username or email already registered")

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        rank=PilotRank.ROOKIE,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    user_out = await _get_user_out(db, user)
    return Token(
        access_token=create_token(user.id),
        token_type="bearer",
        user=user_out,
    )


@router.post("/login", response_model=Token)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.username == form.username))
    user   = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid pilot credentials",
        )
    if not user.is_active:
        raise HTTPException(400, "Account is disabled")

    user_out = await _get_user_out(db, user)
    return Token(
        access_token=create_token(user.id),
        token_type="bearer",
        user=user_out,
    )


@router.get("/me", response_model=UserOut)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_user_out(db, current_user)


@router.post("/logout")
async def logout():
    # JWT is stateless — client just deletes the token
    return {"message": "Logged out"}


@router.patch("/me/password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(400, "Old password is incorrect")
    if len(new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    current_user.password_hash = hash_password(new_password)
    return {"message": "Password updated"}
