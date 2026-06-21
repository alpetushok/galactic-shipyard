# ═══════════════════════════════════════
#  API — Orders
# ═══════════════════════════════════════

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.db.database import get_db, Order, OrderItem, Product, User, OrderStatus

router = APIRouter()


# ── SCHEMAS ──
class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = 1


class OrderCreate(BaseModel):
    user_id: int
    items: List[OrderItemIn]
    sector: str = "CORUSCANT · D-7"


class OrderItemOut(BaseModel):
    product_id: int
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    user_id: int
    status: str
    total: float
    sector: str
    created_at: datetime
    items: List[OrderItemOut]

    class Config:
        from_attributes = True


# ── ROUTES ──
@router.post("/", response_model=OrderOut, status_code=201)
async def create_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    total = 0.0
    order_items = []

    for item_in in payload.items:
        result = await db.execute(select(Product).where(Product.id == item_in.product_id, Product.is_active == True))
        product = result.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found")
        if product.stock < item_in.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")

        product.stock -= item_in.quantity
        line_total = product.price * item_in.quantity
        total += line_total

        order_items.append(OrderItem(
            product_id=item_in.product_id,
            quantity=item_in.quantity,
            unit_price=product.price,
        ))

    order = Order(user_id=payload.user_id, total=total, sector=payload.sector)
    db.add(order)
    await db.flush()

    for oi in order_items:
        oi.order_id = order.id
        db.add(oi)

    await db.flush()
    await db.refresh(order)
    return OrderOut.model_validate(order)


@router.get("/user/{user_id}", response_model=List[OrderOut])
async def get_user_orders(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc()))
    return [OrderOut.model_validate(o) for o in result.scalars().all()]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderOut.model_validate(order)


@router.patch("/{order_id}/status")
async def update_order_status(order_id: int, status: str, db: AsyncSession = Depends(get_db)):
    if status not in [s.value for s in OrderStatus]:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    order.updated_at = datetime.utcnow()
    return {"id": order_id, "status": status}
