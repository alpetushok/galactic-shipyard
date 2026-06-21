# ═══════════════════════════════════════
#  DATABASE — SQLAlchemy + PostgreSQL
# ═══════════════════════════════════════

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from datetime import datetime
from typing import Optional, List
import enum
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://shipyard:galactic@localhost:5432/galactic_shipyard"
)

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


# ── ENUMS ──
class OrderStatus(str, enum.Enum):
    PENDING    = "PENDING"
    PROCESSING = "PROCESSING"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED  = "DELIVERED"
    CANCELLED  = "CANCELLED"

class Category(str, enum.Enum):
    drive  = "drive"
    weapon = "weapon"
    shield = "shield"
    sensor = "sensor"
    hull   = "hull"

class PilotRank(str, enum.Enum):
    ROOKIE    = "ROOKIE"
    BOUNTY    = "BOUNTY"
    SMUGGLER  = "SMUGGLER"
    PILOT     = "PILOT"
    ACE       = "ACE"
    LEGEND    = "LEGEND"


# ── MODELS ──
class Product(Base):
    __tablename__ = "products"

    id:          Mapped[int]   = mapped_column(Integer, primary_key=True, index=True)
    name:        Mapped[str]   = mapped_column(String(120))
    category:    Mapped[str]   = mapped_column(String(20))
    price:       Mapped[float] = mapped_column(Float)
    stock:       Mapped[int]   = mapped_column(Integer, default=100)
    description: Mapped[str]   = mapped_column(Text, default="")
    output:      Mapped[str]   = mapped_column(String(40), default="—")
    mass:        Mapped[str]   = mapped_column(String(40), default="—")
    rating:      Mapped[str]   = mapped_column(String(40), default="—")
    grade:       Mapped[str]   = mapped_column(String(10), default="A")
    color_hex:   Mapped[str]   = mapped_column(String(10), default="#00E5FF")
    is_active:   Mapped[bool]  = mapped_column(Boolean, default=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    compatible_ships: Mapped[List["ShipCompat"]] = relationship("ShipCompat", back_populates="product")
    order_items:      Mapped[List["OrderItem"]]  = relationship("OrderItem", back_populates="product")


class Ship(Base):
    __tablename__ = "ships"

    id:        Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name:      Mapped[str] = mapped_column(String(120))
    cls:       Mapped[str] = mapped_column(String(80))
    color_hex: Mapped[str] = mapped_column(String(10), default="#8EACCD")

    compatible_parts: Mapped[List["ShipCompat"]] = relationship("ShipCompat", back_populates="ship")


class ShipCompat(Base):
    """Many-to-many: products ↔ ships"""
    __tablename__ = "ship_compat"

    id:         Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    ship_id:    Mapped[int] = mapped_column(ForeignKey("ships.id"))

    product: Mapped["Product"] = relationship("Product", back_populates="compatible_ships")
    ship:    Mapped["Ship"]    = relationship("Ship", back_populates="compatible_parts")


class User(Base):
    __tablename__ = "users"

    id:           Mapped[int]  = mapped_column(Integer, primary_key=True, index=True)
    username:     Mapped[str]  = mapped_column(String(60), unique=True, index=True)
    email:        Mapped[str]  = mapped_column(String(120), unique=True, index=True)
    password_hash:Mapped[str]  = mapped_column(String(200))
    rank:         Mapped[str]  = mapped_column(String(20), default=PilotRank.ROOKIE)
    credits_spent:Mapped[float]= mapped_column(Float, default=0.0)
    is_active:    Mapped[bool] = mapped_column(Boolean, default=True)
    created_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    orders: Mapped[List["Order"]] = relationship("Order", back_populates="user")


class Order(Base):
    __tablename__ = "orders"

    id:          Mapped[int]   = mapped_column(Integer, primary_key=True, index=True)
    user_id:     Mapped[int]   = mapped_column(ForeignKey("users.id"))
    status:      Mapped[str]   = mapped_column(String(20), default=OrderStatus.PENDING)
    total:       Mapped[float] = mapped_column(Float)
    sector:      Mapped[str]   = mapped_column(String(40), default="CORUSCANT · D-7")
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user:  Mapped["User"]         = relationship("User", back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id:         Mapped[int]   = mapped_column(Integer, primary_key=True)
    order_id:   Mapped[int]   = mapped_column(ForeignKey("orders.id"))
    product_id: Mapped[int]   = mapped_column(ForeignKey("products.id"))
    quantity:   Mapped[int]   = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float)

    order:   Mapped["Order"]   = relationship("Order", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="order_items")


# ── SESSION DEPENDENCY ──
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
