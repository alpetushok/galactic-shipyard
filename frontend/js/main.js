// ═══════════════════════════════════════
//  GALACTIC SHIPYARD — MAIN
// ═══════════════════════════════════════

/* ── PAGE ROUTER ── */
const PAGE_IDS = ['home', 'catalog', 'hangar', 'command', 'cargo', 'profile', 'game'];
let currentPage = 'home';
let heroInited = false;
let hangarInited = false;

function showPage(name) {
  if (!PAGE_IDS.includes(name)) return;

  // Hide all
  PAGE_IDS.forEach(id => {
    const el = document.getElementById(`page-${id}`);
    if (el) el.classList.remove('active');
  });

  // Show target
  const target = document.getElementById(`page-${name}`);
  if (target) target.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-link').forEach((link, i) => {
    link.classList.toggle('active', link.dataset.page === name);
  });

  currentPage = name;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Page-specific init
  switch (name) {
    case 'home':
      if (!heroInited) {
        HeroShip.init();
        heroInited = true;
      }
      animateCounter('stat-parts', 24000);
      animateCounter('stat-ships', 847);
      animateCounter('stat-sectors', 32);
      break;

    case 'catalog':
      renderGrid('catalog-grid', PRODUCTS);
      break;

    case 'hangar':
      renderHangar();
      if (!hangarInited) {
        setTimeout(() => { HangarScene.init(1); hangarInited = true; }, 80);
      }
      break;

    case 'command':
      renderAchievements();
      setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.top < window.innerHeight) el.classList.add('visible');
        });
      }, 100);
      break;

    case 'cargo':
      renderCart();
      break;

    case 'profile':
      renderProfilePage();
      break;

    case 'game':
      enterGame();
      break;
  }
}

/* ── NAV LINK WIRING ── */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => showPage(link.dataset.page));
});

/* ── CHECKOUT ── */
document.getElementById('checkout-btn') && document.getElementById('checkout-btn').addEventListener('click', () => {
  if (Cart.getCount() === 0) {
    showToast('◎ CARGO HOLD IS EMPTY');
    return;
  }
  showToast('◈ TRANSFER INITIATED — PROCESSING...');
  const btn = document.getElementById('checkout-btn');
  btn.textContent = '▸ PROCESSING...';
  btn.style.borderColor = 'var(--orange)';
  btn.style.color = 'var(--orange)';
  setTimeout(() => {
    btn.textContent = '✓ ORDER CONFIRMED';
    btn.style.borderColor = 'var(--green)';
    btn.style.color = 'var(--green)';
    showToast('✓ ORDER SUBMITTED — HYPERSPACE DELIVERY SCHEDULED');
  }, 2000);
});

/* ── AUDIO TOGGLE (optional) ── */
const audioToggle = document.getElementById('audio-toggle');
let audioOn = false;
audioToggle && audioToggle.addEventListener('click', () => {
  audioOn = !audioOn;
  audioToggle.querySelector('span').textContent = audioOn ? '♪' : '♩';
  audioToggle.style.color = audioOn ? 'var(--cyan)' : '';
  audioToggle.style.borderColor = audioOn ? 'var(--cyan)' : '';
  showToast(audioOn ? '◈ AUDIO ENABLED' : '◎ AUDIO MUTED');
  // Real audio can be wired here via Web Audio API
});

/* ── KEYBOARD SHORTCUTS ── */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const map = { '1': 'home', '2': 'catalog', '3': 'hangar', '4': 'command', '5': 'cargo' };
  if (map[e.key]) showPage(map[e.key]);
  if (e.key === 'Escape' && currentPage !== 'home') showPage('home');
});

/* ── CURSOR GLOW EFFECT ── */
const cursorGlow = document.createElement('div');
cursorGlow.style.cssText = `
  position: fixed; pointer-events: none; z-index: 9998;
  width: 300px; height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0,229,255,0.04) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  transition: opacity .3s;
  top: -999px; left: -999px;
`;
document.body.appendChild(cursorGlow);

let cursorVisible = false;
document.addEventListener('mousemove', e => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top = e.clientY + 'px';
  if (!cursorVisible) { cursorGlow.style.opacity = '1'; cursorVisible = true; }
});
document.addEventListener('mouseleave', () => { cursorGlow.style.opacity = '0'; cursorVisible = false; });

/* ── LIVE CLOCK IN HUD ── */
function updateHudClock() {
  const now = new Date();
  const els = document.querySelectorAll('.hud-clock');
  els.forEach(el => {
    el.textContent = now.toISOString().substring(11, 19) + ' GST';
  });
}
setInterval(updateHudClock, 1000);

/* ── MAGNETIC BUTTON EFFECT ── */
document.querySelectorAll('.btn-primary, .btn-secondary, .nav-btn').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

/* ── INIT ── */
initCatalogControls();
initReveal();

// Auth init
Auth.renderNavAuth();
// Wire profile nav button
const btnProfile = document.getElementById('btn-profile');
if (btnProfile) {
  btnProfile.onclick = () => showPage('profile');
}
// Wire connect button
const btnConnect = document.getElementById('btn-connect');
if (btnConnect) {
  btnConnect.onclick = () => showPage('profile');
}
renderGrid('featured-grid', PRODUCTS.slice(0, 4));

// Boot sequence
showPage('home');

// Staggered card reveal on home
setTimeout(() => {
  document.querySelectorAll('.product-card').forEach((card, i) => {
    setTimeout(() => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'all .5s ease';
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    }, i * 80);
  });
}, 300);

/* ── GAME ENTRY / EXIT ── */
let _gameInited = false;
let _cachedXWingModel = null;

function enterGame() {
  const locked = document.getElementById('game-locked');
  // Check if user has a ship (X-Wing free for registered users)
  const hasShip = !Auth.isLoggedIn() ? false : true; // Logged-in users always have X-Wing

  if (!hasShip) {
    if (locked) locked.style.display = 'flex';
    return;
  }
  if (locked) locked.style.display = 'none';

  if (_gameInited) return; // already running
  _gameInited = true;

  const canvas = document.getElementById('game-canvas');
  if (!canvas || !window.THREE) return;

  // Try to reuse already-loaded X-Wing GLB
  const xwingShip = SHIPS.find(s => s.id === 2 && s.glb);
  if (xwingShip && window.THREE && THREE.GLTFLoader) {
    const loader = new THREE.GLTFLoader();
    loader.load(xwingShip.glb,
      gltf => { SpaceGame.init(canvas, gltf.scene); },
      null,
      () => { SpaceGame.init(canvas, null); } // fallback: procedural ship
    );
  } else {
    SpaceGame.init(canvas, null);
  }

  canvas.addEventListener('mousemove', e => SpaceGame.onMouseMove(e));

  // ESC to exit
  document.addEventListener('keydown', _gameEscHandler);
  window.addEventListener('resize', () => SpaceGame.resize());
}

function _gameEscHandler(e) {
  if (e.code === 'Escape' && currentPage === 'game') exitGame();
}

function exitGame() {
  SpaceGame.destroy();
  _gameInited = false;
  document.removeEventListener('keydown', _gameEscHandler);
  showPage('home');
}

console.log('%c⬡ GALACTIC SHIPYARD v1.0.0', 'color:#00E5FF;font-family:monospace;font-size:14px;font-weight:bold');
console.log('%cCORUSCANT SECTOR · ALL SYSTEMS NOMINAL', 'color:#4A7B9D;font-family:monospace;font-size:10px');
