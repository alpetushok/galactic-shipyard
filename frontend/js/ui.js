// ═══════════════════════════════════════
//  GALACTIC SHIPYARD — UI MODULE
// ═══════════════════════════════════════

/* ── CART STATE ── */
const Cart = (() => {
  let items = [];

  function add(productId) {
    const p = PRODUCTS.find(x => x.id === productId);
    if (!p) return;
    const existing = items.find(x => x.id === productId);
    if (existing) {
      existing.qty++;
    } else {
      items.push({ ...p, qty: 1 });
    }
    renderCart();
    updateCartBadge();
    showToast(`◈ ${p.name} added to cargo`);
    flashScreen();
  }

  function remove(productId) {
    items = items.filter(x => x.id !== productId);
    renderCart();
    updateCartBadge();
  }

  function getTotal() {
    return items.reduce((sum, x) => sum + x.price * x.qty, 0);
  }

  function getCount() {
    return items.reduce((sum, x) => sum + x.qty, 0);
  }

  function getItems() { return items; }

  return { add, remove, getTotal, getCount, getItems };
})();

/* ── FLASH EFFECT ── */
function flashScreen() {
  const fl = document.createElement('div');
  fl.style.cssText = 'position:fixed;inset:0;background:rgba(0,229,255,0.04);pointer-events:none;z-index:9999;animation:flashAnim .4s ease forwards';
  document.body.appendChild(fl);
  setTimeout(() => fl.remove(), 450);
}

/* ── TOAST ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── CART BADGE ── */
function updateCartBadge() {
  const count = Cart.getCount();
  document.getElementById('cart-count').textContent = count;
}

/* ── RENDER PRODUCT CARD ── */
function renderProductCard(p) {
  const div = document.createElement('div');
  div.className = 'product-card';
  div.innerHTML = `
    <div class="card-corner"></div>
    <div class="card-img">
      <canvas class="card-canvas" id="canvas-${p.id}" width="280" height="170"></canvas>
      <div class="card-scan"></div>
    </div>
    <div class="card-body">
      <div class="card-category">${p.cat.toUpperCase()} · GRADE-A</div>
      <div class="card-name">${p.name}</div>
      <div class="card-compat">
        ${p.ship.map(s => `<span class="compat-tag">${s}</span>`).join('')}
      </div>
      <div class="card-specs">
        <div class="card-spec">
          <span class="card-spec-val">${p.output}</span>
          <span class="card-spec-label">Output</span>
        </div>
        <div class="card-spec">
          <span class="card-spec-val">${p.mass}</span>
          <span class="card-spec-label">Mass</span>
        </div>
        <div class="card-spec">
          <span class="card-spec-val">${p.rating}</span>
          <span class="card-spec-label">Rating</span>
        </div>
      </div>
      <div class="card-footer">
        <div class="card-price">
          ${p.price.toLocaleString()} <span class="price-unit">CR</span>
        </div>
        <button class="card-buy" data-id="${p.id}">ADD TO CARGO</button>
      </div>
    </div>
  `;

  div.querySelector('.card-buy').addEventListener('click', e => {
    e.stopPropagation();
    Cart.add(p.id);
    const btn = e.currentTarget;
    btn.textContent = '✓ LOADED';
    btn.style.borderColor = 'var(--green)';
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.textContent = 'ADD TO CARGO';
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 1200);
  });

  return div;
}

/* ── RENDER GRID ── */
function renderGrid(containerId, products) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted);font-family:var(--font-hud);font-size:.7rem;letter-spacing:3px">NO COMPONENTS FOUND</div>`;
    return;
  }

  products.forEach(p => {
    const card = renderProductCard(p);
    container.appendChild(card);
  });

  // Init 3D after DOM paint
  requestAnimationFrame(() => {
    products.forEach(p => {
      const el = document.getElementById(`canvas-${p.id}`);
      if (el) makeProductCanvas(el, p.color);
    });
  });
}

/* ── RENDER CART ── */
function renderCart() {
  const container = document.getElementById('cargo-items');
  const empty = document.getElementById('cargo-empty');
  const totalEl = document.getElementById('cargo-total');
  const countLabel = document.getElementById('cargo-count-label');
  const barFill = document.getElementById('cargo-bar-fill');
  const items = Cart.getItems();

  // Clear existing items (keep empty placeholder)
  Array.from(container.children).forEach(c => {
    if (c !== empty) c.remove();
  });

  if (items.length === 0) {
    empty.style.display = 'block';
    totalEl.textContent = '0 CR';
    countLabel.textContent = '0 ITEMS';
    barFill.style.width = '0%';
    return;
  }

  empty.style.display = 'none';
  countLabel.textContent = `${Cart.getCount()} ITEM${Cart.getCount() !== 1 ? 'S' : ''}`;

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cargo-item';
    div.innerHTML = `
      <div class="cargo-thumb">
        <canvas width="52" height="52"></canvas>
      </div>
      <div class="cargo-info">
        <div class="cargo-name">${item.name}</div>
        <div class="cargo-qty">QTY: ${item.qty} · UNIT: ${item.price.toLocaleString()} CR</div>
      </div>
      <div class="cargo-price">${(item.price * item.qty).toLocaleString()} CR</div>
      <button class="cargo-remove" title="Remove">✕</button>
    `;

    div.querySelector('.cargo-remove').addEventListener('click', () => {
      div.style.opacity = '0';
      div.style.transform = 'translateX(20px)';
      div.style.transition = 'all .3s';
      setTimeout(() => Cart.remove(item.id), 300);
    });

    container.appendChild(div);

    const cv = div.querySelector('canvas');
    if (cv) makeCargoCanvas(cv, item.color);
  });

  totalEl.textContent = Cart.getTotal().toLocaleString() + ' CR';

  // Bar fill based on cart value (arbitrary max 100k)
  const pct = Math.min((Cart.getTotal() / 100000) * 100, 100);
  barFill.style.width = pct + '%';
}

/* ── RENDER HANGAR ── */
function renderHangar() {
  const shipList = document.getElementById('ship-list');
  shipList.innerHTML = '';

  SHIPS.forEach((ship, i) => {
    const btn = document.createElement('button');
    btn.className = 'ship-btn' + (i === 0 ? ' active' : '');

    const statusColor = ship.glb ? 'var(--green)' : 'var(--muted)';
    const statusLabel = ship.glb ? '● AVAILABLE' : '○ COMING SOON';

    btn.innerHTML =
      '<span style="font-size:.68rem;font-weight:700;letter-spacing:1px">' + ship.name + '</span>' +
      '<span style="font-size:.52rem;color:var(--muted);letter-spacing:1px">' + ship.cls + '</span>' +
      '<span style="font-size:.5rem;letter-spacing:2px;color:' + statusColor + ';margin-top:2px">' + statusLabel + '</span>';

    btn.style.cssText += 'display:flex;flex-direction:column;gap:.15rem;text-align:left;';
    if (!ship.glb) btn.style.opacity = '0.55';

    btn.addEventListener('click', () => {
      document.querySelectorAll('.ship-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('hangar-ship-name').textContent = ship.name;
      HangarScene.init(ship.id);
    });

    shipList.appendChild(btn);
  });

  // Node list
  const nodeList = document.getElementById('node-list');
  nodeList.innerHTML = '';
  NODES.forEach(node => {
    const div = document.createElement('div');
    div.className = 'node-item';
    div.innerHTML = `
      <span class="node-name">${node.name}</span>
      <span class="node-dot ${node.status}"></span>
    `;
    div.addEventListener('click', () => {
      document.querySelectorAll('.node-item').forEach(n => n.classList.remove('active'));
      div.classList.add('active');
      showNodeParts(node);
    });
    nodeList.appendChild(div);
  });
}

function showNodeParts(node) {
  const section = document.getElementById('node-parts-section');
  const container = document.getElementById('node-parts');
  section.style.display = 'block';

  const compatible = PRODUCTS.filter(p => p.cat === node.cat).slice(0, 4);
  container.innerHTML = '';

  if (compatible.length === 0) {
    container.innerHTML = `<div style="color:var(--muted);font-size:.65rem;letter-spacing:2px">NO PARTS FOUND</div>`;
    return;
  }

  compatible.forEach(p => {
    const div = document.createElement('div');
    div.className = 'node-part';
    div.innerHTML = `<span>${p.name}</span><span class="node-part-price">${p.price.toLocaleString()} CR</span>`;
    div.addEventListener('click', () => Cart.add(p.id));
    container.appendChild(div);
  });
}

/* ── RENDER ACHIEVEMENTS ── */
function renderAchievements() {
  const grid = document.getElementById('achievements-grid');
  if (!grid) return;
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const div = document.createElement('div');
    div.className = 'ach' + (a.unlocked ? ' unlocked' : ' locked');
    div.innerHTML = `
      <div class="ach-icon">${a.icon}</div>
      <div>
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.unlocked ? 'UNLOCKED' : a.desc.toUpperCase()}</div>
      </div>
    `;
    grid.appendChild(div);
  });
}

/* ── COUNTER ANIMATION ── */
function animateCounter(id, target, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1800;
  const start = Date.now();
  const isLarge = target > 999;
  const displayTarget = isLarge ? target / 1000 : target;

  function step() {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    const current = displayTarget * ease;
    el.textContent = (isLarge ? current.toFixed(1) + 'K' : Math.floor(current)) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = (isLarge ? displayTarget.toFixed(1) + 'K' : target) + suffix;
  }
  requestAnimationFrame(step);
}

/* ── CATALOG SEARCH & FILTER ── */
function initCatalogControls() {
  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  let currentCat = 'all';
  let currentSearch = '';

  function applyFilters() {
    let filtered = PRODUCTS;
    if (currentCat !== 'all') filtered = filtered.filter(p => p.cat === currentCat);
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.ship.some(s => s.toLowerCase().includes(q)) ||
        p.cat.toLowerCase().includes(q)
      );
    }
    renderGrid('catalog-grid', filtered);
  }

  searchInput && searchInput.addEventListener('input', e => {
    currentSearch = e.target.value.trim();
    applyFilters();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      applyFilters();
    });
  });
}

/* ── REVEAL ON SCROLL ── */
function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ── CSS FLASH KEYFRAME ── */
const style = document.createElement('style');
style.textContent = '@keyframes flashAnim{0%{opacity:1}100%{opacity:0}}';
document.head.appendChild(style);
