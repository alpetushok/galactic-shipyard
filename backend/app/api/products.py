# ═══════════════════════════════════════
#  API — Products
# ═══════════════════════════════════════

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional, List
from app.db.database import get_db, Product
from app.db.redis_client import cache_get, cache_set, cache_delete_pattern

router = APIRouter()

CACHE_TTL = 120  # 2 minutes


# ── SCHEMAS ──
class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    price: float
    stock: int
    description: str
    output: str
    mass: str
    rating: str
    grade: str
    color_hex: str
    is_active: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    stock: int = 100
    description: str = ""
    output: str = "—"
    mass: str = "—"
    rating: str = "—"
    grade: str = "A"
    color_hex: str = "#00E5FF"


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ── ROUTES ──
@router.get("/", response_model=List[ProductOut])
async def list_products(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    in_stock: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"products:{category}:{search}:{min_price}:{max_price}:{in_stock}:{skip}:{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    stmt = select(Product).where(Product.is_active == True)

    if category:
        stmt = stmt.where(Product.category == category)
    if search:
        stmt = stmt.where(Product.name.ilike(f"%{search}%"))
    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if in_stock:
        stmt = stmt.where(Product.stock > 0)

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    products = result.scalars().all()
    data = [ProductOut.model_validate(p).model_dump() for p in products]
    await cache_set(cache_key, data, ttl=CACHE_TTL)
    return data


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    cached = await cache_get(f"product:{product_id}")
    if cached:
        return cached

    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Component not found in inventory")

    data = ProductOut.model_validate(product).model_dump()
    await cache_set(f"product:{product_id}", data, ttl=300)
    return data


@router.post("/", response_model=ProductOut, status_code=201)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    await cache_delete_pattern("products:*")
    return ProductOut.model_validate(product)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, payload: ProductUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Component not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(product, field, value)

    await db.flush()
    await db.refresh(product)
    await cache_delete_pattern("products:*")
    await cache_delete_pattern(f"product:{product_id}")
    return ProductOut.model_validate(product)


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Component not found")
    product.is_active = False
    await cache_delete_pattern("products:*")
    await cache_delete_pattern(f"product:{product_id}")
