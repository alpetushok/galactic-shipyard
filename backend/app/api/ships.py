# ═══════════════════════════════════════
#  API — Ships
# ═══════════════════════════════════════

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List
from app.db.database import get_db, Ship

router = APIRouter()


class ShipOut(BaseModel):
    id: int
    name: str
    cls: str
    color_hex: str

    class Config:
        from_attributes = True


class ShipCreate(BaseModel):
    name: str
    cls: str
    color_hex: str = "#8EACCD"


@router.get("/", response_model=List[ShipOut])
async def list_ships(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ship))
    return [ShipOut.model_validate(s) for s in result.scalars().all()]


@router.get("/{ship_id}", response_model=ShipOut)
async def get_ship(ship_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ship).where(Ship.id == ship_id))
    ship = result.scalar_one_or_none()
    if not ship:
        raise HTTPException(status_code=404, detail="Vessel not found in registry")
    return ShipOut.model_validate(ship)


@router.post("/", response_model=ShipOut, status_code=201)
async def create_ship(payload: ShipCreate, db: AsyncSession = Depends(get_db)):
    ship = Ship(**payload.model_dump())
    db.add(ship)
    await db.flush()
    await db.refresh(ship)
    return ShipOut.model_validate(ship)
