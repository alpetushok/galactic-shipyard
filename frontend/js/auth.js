// ═══════════════════════════════════════
//  GALACTIC SHIPYARD — AUTH MODULE v2
//  Dual-mode: API backend OR localStorage fallback
//  Developer account built-in
// ═══════════════════════════════════════

const Auth = (() => {
  const API        = 'http://localhost:8000/api/v1';
  const TOKEN_KEY  = 'gs_token';
  const USER_KEY   = 'gs_user';
  const USERS_KEY  = 'gs_users_db'; // local users DB when backend offline

  // ── Developer account (always available) ──
  const DEV_ACCOUNT = {
    id: 0,
    username: 'developer',
    email: 'dev@galactic-shipyard.space',
    password: 'GalacticDev2025!',
    rank: 'LEGEND',
    credits_spent: 999999,
    total_orders: 9999,
    owned_ships: [1, 2, 3, 4, 5],
    created_at: new Date('2025-01-01').toISOString(),
    isDev: true,
  };

  // ── STATE ──
  let _token = localStorage.getItem(TOKEN_KEY) || null;
  let _user  = (() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch(e) { return null; }
  })();
  let _useLocalMode = false; // set true after first API failure

  // ── LOCAL DB helpers ──
  function _getLocalUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch(e) { return []; }
  }
  function _saveLocalUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  function _makeToken(userId) {
    // Simple base64 pseudo-token for local mode
    return 'local_' + btoa(JSON.stringify({ id: userId, exp: Date.now() + 7*24*3600*1000 }));
  }

  // ── GETTERS ──
  function isLoggedIn()    { return !!_token && !!_user; }
  function getUser()       { return _user; }
  function getToken()      { return _token; }
  function ownsShip(id)    { return _user && (_user.owned_ships||[]).includes(id); }
  function hasAnyShip()    { return _user && (_user.owned_ships||[]).length > 0; }
  function isDevMode()     { return _useLocalMode; }

  // ── SAVE / CLEAR ──
  function _save(token, user) {
    _token = token; _user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    _onAuthChange();
  }

  function logout() {
    _token = null; _user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    _onAuthChange();
    showToast('◎ LOGGED OUT SUCCESSFULLY');
  }

  // ── CHECK IF BACKEND IS REACHABLE ──
  async function _checkBackend() {
    try {
      const res = await fetch(API.replace('/api/v1', '/api/health'), {
        signal: AbortSignal.timeout(2500),
      });
      return res.ok;
    } catch(e) {
      return false;
    }
  }

  // ── LOCAL REGISTER ──
  function _localRegister(username, email, password) {
    const users = _getLocalUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username already taken');
    }
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }
    const user = {
      id: Date.now(),
      username,
      email,
      password, // plain in local mode — dev only
      rank: 'ROOKIE',
      credits_spent: 0,
      total_orders: 0,
      owned_ships: [2], // free X-Wing
      created_at: new Date().toISOString(),
    };
    users.push(user);
    _saveLocalUsers(users);
    return user;
  }

  // ── LOCAL LOGIN ──
  function _localLogin(username, password) {
    // Check dev account first
    if (username.toLowerCase() === DEV_ACCOUNT.username && password === DEV_ACCOUNT.password) {
      return { ...DEV_ACCOUNT };
    }
    if (username.toLowerCase() === DEV_ACCOUNT.email && password === DEV_ACCOUNT.password) {
      return { ...DEV_ACCOUNT };
    }

    const users = _getLocalUsers();
    const user  = users.find(u =>
      u.username.toLowerCase() === username.toLowerCase() ||
      u.email.toLowerCase()    === username.toLowerCase()
    );
    if (!user) throw new Error('Pilot not found in registry');
    if (user.password !== password) throw new Error('Invalid access code');
    return user;
  }

  // ── PUBLIC REGISTER ──
  async function register(username, email, password) {
    const backendUp = await _checkBackend();

    if (backendUp) {
      try {
        const res = await fetch(API + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');
        _save(data.access_token, data.user);
        showToast(`◈ WELCOME ABOARD, ${data.user.username.toUpperCase()}`);
        return data.user;
      } catch(e) {
        // If it's a network error, fall through to local mode
        if (e.name === 'TypeError') {
          _useLocalMode = true;
        } else {
          throw e;
        }
      }
    }

    // ── LOCAL MODE ──
    _useLocalMode = true;
    const user  = _localRegister(username, email, password);
    const token = _makeToken(user.id);
    _save(token, user);
    showToast(`◈ WELCOME ABOARD, ${user.username.toUpperCase()} [LOCAL MODE]`);
    return user;
  }

  // ── PUBLIC LOGIN ──
  async function login(username, password) {
    const backendUp = await _checkBackend();

    if (backendUp) {
      try {
        const res = await fetch(API + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Invalid credentials');
        _save(data.access_token, data.user);
        showToast(`◈ WELCOME BACK, ${data.user.username.toUpperCase()}`);
        return data.user;
      } catch(e) {
        if (e.name === 'TypeError') {
          _useLocalMode = true;
        } else {
          throw e;
        }
      }
    }

    // ── LOCAL MODE ──
    _useLocalMode = true;
    const user  = _localLogin(username, password);
    const token = _makeToken(user.id);
    _save(token, user);
    showToast(`◈ WELCOME BACK, ${user.username.toUpperCase()} [LOCAL MODE]`);
    return user;
  }

  async function fetchMe() {
    if (!_token) return null;
    if (_token.startsWith('local_')) return _user; // local mode
    try {
      const res = await fetch(API + '/auth/me', {
        headers: { Authorization: `Bearer ${_token}` },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) { logout(); return null; }
      const user = await res.json();
      _user = user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch(e) {
      return _user; // return cached user if backend unreachable
    }
  }

  // ── AUTH CHANGE → update nav + profile ──
  function _onAuthChange() {
    renderNavAuth();
    const profilePage = document.getElementById('page-profile');
    if (profilePage && profilePage.classList.contains('active')) {
      renderProfilePage();
    }
  }

  function renderNavAuth() {
    const btn = document.getElementById('btn-profile');
    if (!btn) return;
    if (isLoggedIn()) {
      const name = (_user.username || '?').substring(0, 10).toUpperCase();
      btn.textContent = `▸ ${name}`;
      btn.style.borderColor = _user.isDev ? 'var(--purple)' : 'var(--green)';
      btn.style.color       = _user.isDev ? 'var(--purple)' : 'var(--green)';
    } else {
      btn.textContent    = '▸ PROFILE';
      btn.style.borderColor = '';
      btn.style.color       = '';
    }
  }

  return {
    isLoggedIn, getUser, getToken, ownsShip, hasAnyShip,
    login, register, logout, fetchMe, renderNavAuth, isDevMode,
    DEV_ACCOUNT,
  };
})();

/* ══════════════════════════════════════════════════
   PROFILE PAGE RENDERER
══════════════════════════════════════════════════ */
function renderProfilePage() {
  const page = document.getElementById('page-profile');
  if (!page) return;
  Auth.isLoggedIn() ? renderUserProfile(page) : renderAuthForms(page);
}

/* ── AUTH FORMS ── */
function renderAuthForms(page) {
  page.innerHTML = `
    <div class="page-content padded">
      <div class="auth-wrap">
        <div class="auth-header">
          <div class="section-tag">Access Control</div>
          <div class="section-title">PILOT AUTHENTICATION</div>
          <p style="font-size:.8rem;color:var(--muted);margin-top:.5rem;letter-spacing:1px">
            Log in to your galactic account or register a new pilot identity
          </p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login"    onclick="switchAuthTab('login')">◈ LOGIN</button>
          <button class="auth-tab"         id="tab-register" onclick="switchAuthTab('register')">◎ REGISTER</button>
        </div>

        <!-- LOGIN -->
        <div id="auth-form-login" class="auth-form">
          <div class="auth-card">
            <div class="form-group">
              <label class="form-label">PILOT CALLSIGN OR EMAIL</label>
              <input type="text" id="login-username" class="form-input"
                placeholder="username or email@gmail.com"
                autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label">ACCESS CODE</label>
              <div class="input-wrap">
                <input type="password" id="login-password" class="form-input"
                  placeholder="Enter password..."
                  autocomplete="current-password">
                <button class="eye-btn" onclick="togglePwd('login-password',this)">◎</button>
              </div>
            </div>
            <div id="login-error" class="form-error" style="display:none"></div>
            <button class="btn-primary full-width" id="login-btn" onclick="handleLogin()">
              ◈ INITIATE LOGIN
            </button>
            <div class="form-hint">
              No account? <span class="form-link" onclick="switchAuthTab('register')">Register pilot identity →</span>
            </div>
            <div class="dev-hint">
              <span style="color:var(--muted);font-size:.55rem;letter-spacing:2px">DEV ACCESS: </span>
              <span style="color:var(--purple);font-size:.55rem;letter-spacing:1px">developer / GalacticDev2025!</span>
            </div>
          </div>
        </div>

        <!-- REGISTER -->
        <div id="auth-form-register" class="auth-form" style="display:none">
          <div class="auth-card">
            <div class="form-group">
              <label class="form-label">PILOT CALLSIGN</label>
              <input type="text" id="reg-username" class="form-input"
                placeholder="Choose a username..."
                autocomplete="username">
              <div class="form-hint-sm">3–20 characters, letters and numbers</div>
            </div>
            <div class="form-group">
              <label class="form-label">EMAIL ADDRESS</label>
              <input type="email" id="reg-email" class="form-input"
                placeholder="your@gmail.com"
                autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label">ACCESS CODE</label>
              <div class="input-wrap">
                <input type="password" id="reg-password" class="form-input"
                  placeholder="Min 8 characters..."
                  autocomplete="new-password"
                  id="reg-password">
                <button class="eye-btn" onclick="togglePwd('reg-password',this)">◎</button>
              </div>
              <div class="form-hint-sm" id="pwd-strength"></div>
            </div>
            <div class="form-group">
              <label class="form-label">CONFIRM ACCESS CODE</label>
              <input type="password" id="reg-confirm" class="form-input"
                placeholder="Repeat password..."
                autocomplete="new-password">
            </div>
            <div id="reg-error" class="form-error" style="display:none"></div>
            <button class="btn-primary full-width" id="reg-btn" onclick="handleRegister()">
              ◎ CREATE PILOT ACCOUNT
            </button>
            <div class="free-ship-banner">
              🎁 <span>Every new pilot receives a free <strong>T-65 X-Wing</strong></span>
            </div>
            <div class="form-hint">
              Already registered? <span class="form-link" onclick="switchAuthTab('login')">← Login</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Password strength
  const pwdEl = document.getElementById('reg-password');
  if (pwdEl) {
    pwdEl.addEventListener('input', () => {
      const v = pwdEl.value;
      let score = 0;
      if (v.length >= 8)          score++;
      if (/[A-Z]/.test(v))        score++;
      if (/[0-9]/.test(v))        score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      const labels = ['', 'WEAK', 'FAIR', 'STRONG', 'VERY STRONG'];
      const colors = ['', 'var(--red)', 'var(--orange)', 'var(--cyan)', 'var(--green)'];
      const el = document.getElementById('pwd-strength');
      if (el && v.length > 0) {
        el.textContent = `STRENGTH: ${labels[score] || 'WEAK'}`;
        el.style.color = colors[score] || colors[1];
      }
    });
  }

  // Enter key
  const loginPwd = document.getElementById('login-password');
  if (loginPwd) loginPwd.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  const regConfirm = document.getElementById('reg-confirm');
  if (regConfirm) regConfirm.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
}

/* ── USER PROFILE DASHBOARD ── */
function renderUserProfile(page) {
  const user = Auth.getUser();
  const RANK_COLORS    = { ROOKIE:'var(--muted)', BOUNTY:'var(--orange)', SMUGGLER:'var(--cyan)', PILOT:'var(--blue)', ACE:'var(--purple)', LEGEND:'#FFD700' };
  const RANK_PROGRESS  = { ROOKIE:5, BOUNTY:25, SMUGGLER:45, PILOT:65, ACE:85, LEGEND:100 };
  const rankColor      = RANK_COLORS[user.rank]   || 'var(--cyan)';
  const rankPct        = RANK_PROGRESS[user.rank]  || 5;

  // Map ship IDs to names
  const SHIP_NAMES = { 1:'Imperial Star Destroyer', 2:'T-65 X-Wing', 3:'Death Star', 4:'TIE Interceptor', 5:'Y-Wing BTL-S3' };
  const ownedShips = (user.owned_ships || [2]).map(id => SHIP_NAMES[id] || `Ship #${id}`);

  page.innerHTML = `
    <div class="page-content padded">

      <!-- HEADER -->
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-ring"></div>
          <div class="avatar-inner">${(user.username||'?')[0].toUpperCase()}</div>
        </div>
        <div class="profile-info">
          <div class="profile-name">
            ${user.username.toUpperCase()}
            ${user.isDev ? '<span style="margin-left:.5rem;font-size:.55rem;padding:.2rem .5rem;background:rgba(124,77,255,.2);border:1px solid var(--purple);color:var(--purple);letter-spacing:2px">DEV</span>' : ''}
          </div>
          <div class="profile-email">${user.email}</div>
          <div class="profile-rank" style="color:${rankColor}">◈ ${user.rank} CLASS PILOT</div>
          ${Auth.isDevMode() ? '<div style="font-size:.5rem;letter-spacing:2px;color:var(--muted);margin-top:.3rem">◎ LOCAL MODE — backend offline</div>' : ''}
        </div>
        <div class="profile-actions">
          <button class="btn-secondary" onclick="Auth.logout();renderProfilePage()">◎ LOGOUT</button>
        </div>
      </div>

      <!-- RANK BAR -->
      <div class="profile-section reveal">
        <div class="section-tag">Career Progress</div>
        <div class="rank-bar-container" style="margin-top:.75rem">
          <div class="rank-labels">
            <span>ROOKIE</span><span>BOUNTY</span><span>SMUGGLER</span><span>PILOT</span><span>ACE</span><span>LEGEND</span>
          </div>
          <div class="rank-bar">
            <div class="rank-fill" style="width:${rankPct}%;background:${rankColor}"></div>
            <div class="rank-marker" style="left:${rankPct}%;background:${rankColor};box-shadow:0 0 10px ${rankColor}"></div>
          </div>
        </div>
      </div>

      <!-- STATS -->
      <div class="command-grid" style="margin-top:2rem">
        <div class="cmd-card">
          <div class="cmd-icon">◈</div>
          <div class="cmd-val">${(user.total_orders||0).toLocaleString()}</div>
          <div class="cmd-label">Total Orders</div>
        </div>
        <div class="cmd-card">
          <div class="cmd-icon">◎</div>
          <div class="cmd-val">${((user.credits_spent||0)/1000).toFixed(1)}K</div>
          <div class="cmd-label">Credits Spent</div>
        </div>
        <div class="cmd-card">
          <div class="cmd-icon">🚀</div>
          <div class="cmd-val">${ownedShips.length}</div>
          <div class="cmd-label">Ships Owned</div>
        </div>
        <div class="cmd-card">
          <div class="cmd-icon">◇</div>
          <div class="cmd-val" style="font-size:.9rem;color:${rankColor}">${user.rank}</div>
          <div class="cmd-label">Pilot Rank</div>
          <div class="cmd-change up" style="color:${rankColor}">● ACTIVE</div>
        </div>
      </div>

      <!-- OWNED SHIPS -->
      <div class="section-header" style="margin-top:2.5rem">
        <div class="section-tag">Fleet Registry</div>
        <div class="section-title">YOUR SHIPS</div>
      </div>
      <div class="owned-ships-grid">
        ${ownedShips.map(name => `
          <div class="owned-ship-card">
            <div class="owned-ship-icon">🛸</div>
            <div class="owned-ship-name">${name}</div>
            <button class="nav-btn" style="font-size:.5rem;padding:.3rem .7rem"
              onclick="showPage('game')">▸ FLY</button>
          </div>
        `).join('')}
      </div>

      <!-- ACHIEVEMENTS -->
      <div class="section-header" style="margin-top:2.5rem">
        <div class="section-tag">Mission Log</div>
        <div class="section-title">ACHIEVEMENTS</div>
      </div>
      <div class="achievements-grid">
        ${ACHIEVEMENTS.map(a => `
          <div class="ach ${a.unlocked || user.isDev ? 'unlocked' : 'locked'}">
            <div class="ach-icon">${a.icon}</div>
            <div>
              <div class="ach-name">${a.name}</div>
              <div class="ach-desc">${a.unlocked || user.isDev ? 'UNLOCKED' : a.desc.toUpperCase()}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- SETTINGS -->
      <div class="section-header" style="margin-top:2.5rem">
        <div class="section-tag">Account</div>
        <div class="section-title">SETTINGS</div>
      </div>
      <div class="settings-grid">
        <div class="setting-row">
          <div><div class="setting-label">PILOT CALLSIGN</div><div class="setting-val">${user.username}</div></div>
          <button class="nav-btn" onclick="showToast('◎ COMING SOON')">EDIT</button>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">EMAIL ADDRESS</div><div class="setting-val">${user.email}</div></div>
          <button class="nav-btn" onclick="showToast('◎ COMING SOON')">EDIT</button>
        </div>
        <div class="setting-row">
          <div><div class="setting-label">ACCESS CODE</div><div class="setting-val">••••••••••••</div></div>
          <button class="nav-btn" onclick="showToast('◎ COMING SOON')">CHANGE</button>
        </div>
        <div class="setting-row danger">
          <div>
            <div class="setting-label">LOGOUT</div>
            <div class="setting-val" style="color:var(--muted)">Sign out from this device</div>
          </div>
          <button class="nav-btn" style="border-color:var(--red);color:var(--red)"
            onclick="Auth.logout();renderProfilePage()">LOGOUT</button>
        </div>
      </div>

    </div>
  `;
}

/* ══════════════════════════════════════
   FORM HANDLERS
══════════════════════════════════════ */
function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  document.getElementById('auth-form-login').style.display    = tab==='login'    ? 'block' : 'none';
  document.getElementById('auth-form-register').style.display = tab==='register' ? 'block' : 'none';
}

function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const hidden = inp.type === 'password';
  inp.type = hidden ? 'text' : 'password';
  btn.textContent = hidden ? '●' : '◎';
}

function _setBtnLoading(id, loading, originalText) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? '⏳ PROCESSING...' : originalText;
  btn.style.opacity = loading ? '0.6' : '';
}

function _showFormError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent  = '⚠ ' + msg.toUpperCase();
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 6000);
}

async function handleLogin() {
  const username = (document.getElementById('login-username')?.value || '').trim();
  const password =  document.getElementById('login-password')?.value || '';

  if (!username) { _showFormError('login-error', 'Enter your callsign or email'); return; }
  if (!password) { _showFormError('login-error', 'Enter your access code'); return; }

  _setBtnLoading('login-btn', true, '◈ INITIATE LOGIN');
  try {
    await Auth.login(username, password);
    renderProfilePage();
  } catch(e) {
    _showFormError('login-error', e.message);
  } finally {
    _setBtnLoading('login-btn', false, '◈ INITIATE LOGIN');
  }
}

async function handleRegister() {
  const username = (document.getElementById('reg-username')?.value || '').trim();
  const email    = (document.getElementById('reg-email')?.value    || '').trim();
  const password =  document.getElementById('reg-password')?.value || '';
  const confirm  =  document.getElementById('reg-confirm')?.value  || '';

  // Validation
  if (!username)              { _showFormError('reg-error', 'Choose a callsign'); return; }
  if (username.length < 3)    { _showFormError('reg-error', 'Callsign must be at least 3 characters'); return; }
  if (username.length > 20)   { _showFormError('reg-error', 'Callsign must be 20 characters or less'); return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) { _showFormError('reg-error', 'Callsign: letters, numbers and _ only'); return; }
  if (!email)                 { _showFormError('reg-error', 'Enter your email address'); return; }
  // Accept any valid email including gmail.com
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    _showFormError('reg-error', 'Enter a valid email (e.g. your@gmail.com)'); return;
  }
  if (!password)              { _showFormError('reg-error', 'Choose an access code'); return; }
  if (password.length < 8)    { _showFormError('reg-error', 'Access code must be at least 8 characters'); return; }
  if (password !== confirm)   { _showFormError('reg-error', 'Access codes do not match'); return; }

  _setBtnLoading('reg-btn', true, '◎ CREATE PILOT ACCOUNT');
  try {
    await Auth.register(username, email, password);
    renderProfilePage();
  } catch(e) {
    _showFormError('reg-error', e.message);
  } finally {
    _setBtnLoading('reg-btn', false, '◎ CREATE PILOT ACCOUNT');
  }
}
