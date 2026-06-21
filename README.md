<div align="center">

```
  ⬡  G A L A C T I C   S H I P Y A R D  ⬡
```

# Galactic Shipyard

**A premium sci-fi e-commerce platform for starship parts & equipment**

*A personal pet project built in collaboration with [Claude](https://claude.ai) (Anthropic)*

[![Status](https://img.shields.io/badge/status-in%20development-00E5FF?style=flat-square&labelColor=02040A)](.)
[![Stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20Three.js-7C4DFF?style=flat-square&labelColor=02040A)](.)
[![License](https://img.shields.io/badge/license-MIT-1565FF?style=flat-square&labelColor=02040A)](LICENSE)

![Galactic Shipyard Preview](https://raw.githubusercontent.com/your-username/galactic-shipyard/main/docs/preview.png)

</div>

---

## 🛸 About

**Galactic Shipyard** is a pet project I'm actively developing — a sci-fi themed e-commerce store for spaceship parts and equipment, built to look and feel like an actual interface from a distant future.

The goal is to create the most impressive space parts marketplace on the internet — the kind of UI you'd see in a AAA game launcher or a sci-fi film's HUD. Every pixel is intentional. Every animation is cinematic.

This project is developed in collaboration with **Claude Code** (by Anthropic) — an AI coding assistant that helps architect features, write modular code, and solve complex 3D rendering challenges in real time.

> *"It should look like a $100 million interface."*

---

## ✨ Features

### 🎮 Frontend
| Feature | Details |
|---------|---------|
| **3D Hero Ship** | Live Three.js starfighter with WebGL, mouse parallax & floating animation |
| **Starfield Background** | Animated WebGL nebulae + 350 parallax stars |
| **Ship Hangar** | Interactive 3D viewer — drag to rotate, scroll to zoom |
| **GLB Model Support** | Load real `.glb` ship models (Star Destroyer, X-Wing, Death Star, TIE Interceptor) |
| **Product Catalog** | 12 parts with 3D holographic previews, search & category filters |
| **Cargo System** | Sci-fi shopping cart with load animations & 3D item previews |
| **Command Center** | Pilot dashboard with stats, rank progress & achievements |
| **Auth System** | JWT login/register with bcrypt, rank system, pilot profile |
| **Cursor Glow** | Ambient light follows the mouse pointer |
| **Scan Effects** | Laser scan line on card hover |
| **Magnetic Buttons** | Buttons subtly react to cursor position |
| **Keyboard Nav** | `1–5` switch pages, `Esc` returns home |
| **Sound Toggle** | UI audio on/off |

### ⚙️ Backend
| Feature | Details |
|---------|---------|
| **REST API** | Full async CRUD — products, orders, ships, users |
| **JWT Auth** | 7-day tokens, bcrypt password hashing |
| **Redis Cache** | Product listings cached, instant repeated loads |
| **WebSockets** | Real-time inventory & order status updates |
| **PostgreSQL** | Async SQLAlchemy models with full relationships |
| **Auto Docs** | Swagger UI at `/api/docs` |

---

## 🖼️ Screenshots

> *Add your screenshots here once deployed*

```
HOME        → 3D ship hero + featured parts
CATALOG     → holographic product grid + filters
HANGAR      → interactive 3D ship viewer
COMMAND     → pilot dashboard & rank system
CARGO       → sci-fi shopping cart
PROFILE     → login / register / account
```

---

## 🚀 Tech Stack

```
Frontend
├── HTML5 / CSS3 / JavaScript ES2025
├── Three.js r128        → 3D rendering & WebGL
├── GLTFLoader           → .glb ship model loading
└── CSS Animations       → cinematic transitions

Backend
├── Python 3.12
├── FastAPI              → async REST API + WebSockets
├── SQLAlchemy 2.0       → async ORM
├── PostgreSQL 16        → primary database
├── Redis 7              → caching layer
├── passlib + bcrypt     → password hashing
└── python-jose          → JWT tokens

Infrastructure
├── Docker + Docker Compose
└── Nginx                → reverse proxy + static serving
```

---

## 📁 Project Structure

```
galactic-shipyard/
├── frontend/
│   ├── index.html              # SPA shell — 6 pages
│   ├── css/
│   │   └── main.css            # 1800+ lines, full design system
│   ├── js/
│   │   ├── auth.js             # JWT auth, login/register, profile
│   │   ├── data.js             # Products, ships, achievements
│   │   ├── three-scenes.js     # All Three.js scenes (hero, hangar, cards)
│   │   ├── ui.js               # Cart, cards, filters, render logic
│   │   └── main.js             # Router, keyboard shortcuts, init
│   └── models/
│       ├── star_destroyer.glb  # (add your own)
│       ├── x_wing.glb
│       ├── death_star.glb
│       └── tie_interceptor.glb
│
├── backend/
│   ├── main.py                 # FastAPI app + WebSocket feeds
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app/
│       ├── api/
│       │   ├── auth.py         # Register / Login / JWT / Me
│       │   ├── products.py     # CRUD + Redis cache
│       │   ├── orders.py       # Order management
│       │   └── ships.py        # Ship registry
│       └── db/
│           ├── database.py     # SQLAlchemy models + engine
│           └── redis_client.py # Cache helpers
│
├── docker/
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚡ Quick Start

### Option A — Docker (Recommended)

```bash
git clone https://github.com/your-username/galactic-shipyard.git
cd galactic-shipyard

# Copy and configure env
cp .env.example .env

# Launch everything
docker compose up -d

# Open in browser
open http://localhost
```

Services started:
- **Frontend** → `http://localhost`
- **API** → `http://localhost/api`
- **Swagger** → `http://localhost/api/docs`

---

### Option B — Local Development

```bash
# ── Frontend (no build step needed) ──
cd galactic-shipyard/frontend
npx serve .
# or
python -m http.server 3000
# → http://localhost:3000

# ── Backend ──
cd galactic-shipyard/backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start Postgres & Redis via Docker
docker run -d --name gs_pg \
  -e POSTGRES_USER=shipyard \
  -e POSTGRES_PASSWORD=galactic \
  -e POSTGRES_DB=galactic_shipyard \
  -p 5432:5432 postgres:16-alpine

docker run -d --name gs_redis -p 6379:6379 redis:7-alpine

# Run API
uvicorn main:app --reload --port 8000
```

---

## 🔌 API Reference

```
Auth
POST  /api/v1/auth/register     Register new pilot
POST  /api/v1/auth/login        Login (returns JWT)
GET   /api/v1/auth/me           Current pilot profile
PATCH /api/v1/auth/me/password  Change password

Products
GET   /api/v1/products          List (filterable by cat, search, price)
GET   /api/v1/products/:id      Single product
POST  /api/v1/products          Create
PATCH /api/v1/products/:id      Update

Orders
POST  /api/v1/orders            Place order
GET   /api/v1/orders/:id        Get order
GET   /api/v1/orders/user/:id   User order history

Ships
GET   /api/v1/ships             List ships
GET   /api/v1/ships/:id         Single ship

WebSockets
WS    /ws/inventory             Live stock updates (every 5s)
WS    /ws/orders                Live order status (every 8s)

System
GET   /api/health               Health check
```

---

## 🎨 Design System

```css
/* Color Palette */
--bg0:    #02040A   /* Deep space black   */
--bg1:    #050B18   /* Dark navy          */
--cyan:   #00E5FF   /* Primary — neon     */
--blue:   #1565FF   /* Secondary          */
--purple: #7C4DFF   /* Tertiary           */
--red:    #FF1744   /* Danger / weapons   */
--green:  #2ECC71   /* Success / online   */

/* Typography */
Orbitron   — HUD labels, titles, nav, buttons
Rajdhani   — Body text, descriptions, values
```

---

## 🗺️ Roadmap

- [x] 3D hero ship (Three.js GLB loader)
- [x] Interactive ship hangar (drag to rotate, zoom)
- [x] Product catalog with 3D card previews
- [x] Sci-fi shopping cart (cargo system)
- [x] JWT authentication + pilot profiles
- [x] Rank system (Rookie → Legend)
- [x] FastAPI backend + PostgreSQL + Redis
- [ ] Real product images for all parts
- [ ] Checkout flow with order confirmation
- [ ] Admin panel for inventory management
- [ ] Ship configurator (select parts per node)
- [ ] Multiplayer wishlist / compare
- [ ] Mobile responsive overhaul
- [ ] GLTF animations (engine glow, thrusters)
- [ ] Procedural shader backgrounds
- [ ] Deploy to cloud (Fly.io / Railway)

---

## 🤖 Built with Claude Code

This project is developed in collaboration with **Claude** by Anthropic — an AI coding assistant.

Claude helped with:
- Architecting the full-stack structure
- Writing Three.js 3D scenes and GLB loaders
- Building the FastAPI backend with async SQLAlchemy
- Designing the CSS design system (1800+ lines)
- Debugging WebGL camera/lighting issues
- Wiring the JWT auth flow end-to-end

If you're curious about AI-assisted development, this repo is a real-world example of what's possible when you combine creative vision with Claude Code.

---

## 📄 License

MIT — do whatever you want with it, just keep building cool things.

---

<div align="center">

**GALACTIC SHIPYARD · EST. 3 ABY · SECTOR 7-G**

*Made with ☕ and Claude Code*

</div>
