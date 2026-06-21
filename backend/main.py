# ═══════════════════════════════════════
#  GALACTIC SHIPYARD — FastAPI Backend
# ═══════════════════════════════════════

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncio
import json
import random
from datetime import datetime

from app.api import products, orders, ships, auth
from app.db.database import init_db
from app.db.redis_client import get_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    await init_db()
    print("⬡ Galactic Shipyard API — ONLINE")
    yield
    print("◎ Shutting down hyperdrive...")


app = FastAPI(
    title="Galactic Shipyard API",
    description="Premium starship parts marketplace API — Serving the galaxy since 3 ABY",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ──
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(orders.router,   prefix="/api/v1/orders",   tags=["Orders"])
app.include_router(ships.router,    prefix="/api/v1/ships",    tags=["Ships"])
app.include_router(auth.router,     prefix="/api/v1/auth",     tags=["Auth"])

# ── STATIC (serve frontend) ──
app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/", include_in_schema=False)
async def serve_frontend():
    return FileResponse("frontend/index.html")


# ── HEALTH ──
@app.get("/api/health", tags=["System"])
async def health():
    return {
        "status": "OPERATIONAL",
        "sector": "7-G",
        "timestamp": datetime.utcnow().isoformat(),
        "hyperdrive": "CHARGED",
    }


# ── WEBSOCKET: live inventory feed ──
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


manager = ConnectionManager()


@app.websocket("/ws/inventory")
async def ws_inventory(websocket: WebSocket):
    """Real-time inventory updates pushed to connected clients."""
    await manager.connect(websocket)
    try:
        while True:
            # Simulate live stock fluctuation
            await asyncio.sleep(5)
            event = {
                "type": "stock_update",
                "product_id": random.randint(1, 12),
                "stock_delta": random.randint(-3, 5),
                "timestamp": datetime.utcnow().isoformat(),
            }
            await manager.broadcast(event)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.websocket("/ws/orders")
async def ws_orders(websocket: WebSocket):
    """Real-time order status stream."""
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(8)
            event = {
                "type": "order_update",
                "order_id": f"GS-{random.randint(10000, 99999)}",
                "status": random.choice(["PROCESSING", "IN_TRANSIT", "DELIVERED"]),
                "timestamp": datetime.utcnow().isoformat(),
            }
            await manager.broadcast(event)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
