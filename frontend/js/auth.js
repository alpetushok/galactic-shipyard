// ═══════════════════════════════════════
//  GALACTIC SHIPYARD — AUTH MODULE
//  JWT + localStorage + profile UI
// ═══════════════════════════════════════

const Auth = (() => {
  const API = 'http://localhost:8000/api/v1';
  const TOKEN_KEY  = 'gs_token';
  const USER_KEY   = 'gs_user';

  /* ── STATE ── */
  let _token = localStorage.getItem(TOKEN_KEY) || null;
  let _user  = (() => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch(e){ return null; } })();

  /* ── GETTERS ── */
  function isLoggedIn() { return !!_token && !!_user; }
  function getUser()    { return _user; }
  function getToken()   { return _token; }

  /* ── SAVE / CLEAR ── */
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
    showToast('◎ LOGGED OUT');
  }

  /* ── API CALLS ── */
  async function _post(endpoint, body) {
    const res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  }

  async function register(username, email, password) {
    const data = await _post('/auth/register', { username, email, password });
    _save(data.access_token, data.user);
    showToast(`◈ WELCOME, ${data.user.username.toUpperCase()}`);
    return data.user;
  }

  async function login(username, password) {
    // FastAPI OAuth2 form
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
  }

  async function fetchMe() {
    if (!_token) return null;
    const res = await fetch(API + '/auth/me', {
      headers: { Authorization: `Bearer ${_token}` }
    });
    if (!res.ok) { logout(); return null; }
    const user = await res.json();
    _user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  /* ── AUTH CHANGE → update nav + profile UI ── */
  function _onAuthChange() {
    renderNavAuth();
    // Если открыта страница профиля — перерисовываем
    if (document.getElementById('page-profile') && document.getElementById('page-profile').classList.contains('active')) {
      renderProfilePage();
    }
  }

  /* ── NAV BUTTON ── */
  function renderNavAuth() {
    const btn = document.getElementById('btn-profile');
    if (!btn) return;
    if (isLoggedIn()) {
      btn.textContent = `▸ ${_user.username.substring(0,8).toUpperCase()}`;
      btn.style.borderColor = 'var(--green)';
      btn.style.color = 'var(--green)';
    } else {
      btn.textContent = '▸ PROFILE';
      btn.style.borderColor = '';
      btn.style.color = '';
    }
  }

  return { isLoggedIn, getUser, getToken, login, register, logout, fetchMe, renderNavAuth };
})();

/* ══════════════════════════════════════════════════
   PROFILE PAGE RENDERER
══════════════════════════════════════════════════ */
function renderProfilePage() {
  const page = document.getElementById('page-profile');
  if (!page) return;

  if (!Auth.isLoggedIn()) {
    renderAuthForms(page);
  } else {
    renderUserProfile(page);
  }
}

/* ── AUTH FORMS (Login / Register) ── */
function renderAuthForms(container) {
  container.innerHTML = `
    <div class="page-content padded">
      <div class="auth-wrap">

        <div class="auth-header">
          <div class="section-tag">Access Control</div>
          <div class="section-title">PILOT AUTHENTICATION</div>
          <p style="font-size:.8rem;color:var(--muted);margin-top:.5rem;letter-spacing:1px">
            Log in to your galactic account or register a new pilot identity
          </p>
        </div>

        <!-- TABS -->
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login" onclick="switchAuthTab('login')">◈ LOGIN</button>
          <button class="auth-tab" id="tab-register" onclick="switchAuthTab('register')">◎ REGISTER</button>
        </div>

        <!-- LOGIN FORM -->
        <div id="auth-form-login" class="auth-form">
          <div class="auth-card">
            <div class="form-group">
              <label class="form-label">PILOT CALLSIGN</label>
              <input type="text" id="login-username" class="form-input" placeholder="Enter username..." autocomplete="username">
            </div>
            <div class="form-group">
              <label class="form-label">ACCESS CODE</label>
              <div class="input-wrap">
                <input type="password" id="login-password" class="form-input" placeholder="Enter password..." autocomplete="current-password">
                <button class="eye-btn" onclick="togglePwd('login-password',this)">◎</button>
              </div>
            </div>
            <div id="login-error" class="form-error" style="display:none"></div>
            <button class="btn-primary full-width" id="login-btn" onclick="handleLogin()">
              ◈ INITIATE LOGIN
            </button>
            <div class="form-hint">No account? <span class="form-link" onclick="switchAuthTab('register')">Register pilot identity</span></div>
          </div>
        </div>

        <!-- REGISTER FORM -->
        <div id="auth-form-register" class="auth-form" style="display:none">
          <div class="auth-card">
            <div class="form-group">
              <label class="form-label">PILOT CALLSIGN</label>
              <input type="text" id="reg-username" class="form-input" placeholder="Choose username..." autocomplete="username">
              <div class="form-hint-sm">3–20 characters, letters and numbers only</div>
            </div>
            <div class="form-group">
              <label class="form-label">GALACTIC EMAIL</label>
              <input type="email" id="reg-email" class="form-input" placeholder="pilot@galaxy.net" autocomplete="email">
            </div>
            <div class="form-group">
              <label class="form-label">ACCESS CODE</label>
              <div class="input-wrap">
                <input type="password" id="reg-password" class="form-input" placeholder="Min 8 characters..." autocomplete="new-password">
                <button class="eye-btn" onclick="togglePwd('reg-password',this)">◎</button>
              </div>
              <div class="form-hint-sm" id="pwd-strength"></div>
            </div>
            <div class="form-group">
              <label class="form-label">CONFIRM CODE</label>
              <input type="password" id="reg-confirm" class="form-input" placeholder="Repeat password..." autocomplete="new-password">
            </div>
            <div id="reg-error" class="form-error" style="display:none"></div>
            <button class="btn-primary full-width" id="reg-btn" onclick="handleRegister()">
              ◎ REGISTER PILOT
            </button>
            <div class="form-hint">Already registered? <span class="form-link" onclick="switchAuthTab('login')">Login instead</span></div>
          </div>
        </div>

      </div>
    </div>
  `;

  // Password strength meter
  const pwdInput = document.getElementById('reg-password');
  if (pwdInput) {
    pwdInput.addEventListener('input', () => {
      const v = pwdInput.value;
      let score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v)) score++;
      if (/[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      const labels = ['','WEAK','FAIR','STRONG','VERY STRONG'];
      const colors = ['','var(--red)','var(--orange)','var(--cyan)','var(--green)'];
      const el = document.getElementById('pwd-strength');
      if (el && v.length > 0) {
        el.textContent = `STRENGTH: ${labels[score]||'WEAK'}`;
        el.style.color = colors[score]||colors[1];
      }
    });
  }

  // Enter key support
  document.getElementById('login-password') && document.getElementById('login-password').addEventListener('keydown', e => { if(e.key==='Enter') handleLogin(); });
  document.getElementById('reg-confirm') && document.getElementById('reg-confirm').addEventListener('keydown', e => { if(e.key==='Enter') handleRegister(); });
}

/* ── USER PROFILE DASHBOARD ── */
function renderUserProfile(container) {
  const user = Auth.getUser();
  const rankColors = { ROOKIE:'var(--muted)', BOUNTY:'var(--orange)', SMUGGLER:'var(--cyan)', PILOT:'var(--blue)', ACE:'var(--purple)', LEGEND:'#FFD700' };
  const rankColor = rankColors[user.rank] || 'var(--cyan)';
  const rankProgress = { ROOKIE:5, BOUNTY:25, SMUGGLER:45, PILOT:65, ACE:85, LEGEND:100 };
  const progress = rankProgress[user.rank] || 5;

  container.innerHTML = `
    <div class="page-content padded">

      <!-- PROFILE HEADER -->
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-ring"></div>
          <div class="avatar-inner">${(user.username||'?')[0].toUpperCase()}</div>
        </div>
        <div class="profile-info">
          <div class="profile-name">${user.username.toUpperCase()}</div>
          <div class="profile-email">${user.email}</div>
          <div class="profile-rank" style="color:${rankColor}">
            ◈ ${user.rank} CLASS PILOT
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn-secondary" onclick="Auth.logout();renderProfilePage()">◎ LOGOUT</button>
        </div>
      </div>

      <!-- RANK PROGRESS -->
      <div class="profile-section reveal">
        <div class="section-tag">Career Progress</div>
        <div class="rank-bar-container" style="margin-top:.75rem">
          <div class="rank-labels">
            <span>ROOKIE</span><span>BOUNTY</span><span>SMUGGLER</span><span>PILOT</span><span>ACE</span><span>LEGEND</span>
          </div>
          <div class="rank-bar">
            <div class="rank-fill" style="width:${progress}%;background:${rankColor}"></div>
            <div class="rank-marker" style="left:${progress}%;background:${rankColor};box-shadow:0 0 10px ${rankColor}"></div>
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
          <div class="cmd-icon">⬡</div>
          <div class="cmd-val">${user.rank}</div>
          <div class="cmd-label">Pilot Rank</div>
          <div class="cmd-change up" style="color:${rankColor}">● ACTIVE</div>
        </div>
        <div class="cmd-card">
          <div class="cmd-icon">◇</div>
          <div class="cmd-val">${user.id}</div>
          <div class="cmd-label">Pilot ID</div>
        </div>
      </div>

      <!-- ACHIEVEMENTS -->
      <div class="section-header" style="margin-top:3rem">
        <div class="section-tag">Mission Log</div>
        <div class="section-title">ACHIEVEMENTS</div>
      </div>
      <div class="achievements-grid">
        ${ACHIEVEMENTS.map(a => `
          <div class="ach ${a.unlocked?'unlocked':'locked'}">
            <div class="ach-icon">${a.icon}</div>
            <div>
              <div class="ach-name">${a.name}</div>
              <div class="ach-desc">${a.unlocked?'UNLOCKED':a.desc.toUpperCase()}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- SETTINGS -->
      <div class="section-header" style="margin-top:3rem">
        <div class="section-tag">Account</div>
        <div class="section-title">SETTINGS</div>
      </div>
      <div class="settings-grid">
        <div class="setting-row">
          <div>
            <div class="setting-label">PILOT CALLSIGN</div>
            <div class="setting-val">${user.username}</div>
          </div>
          <button class="nav-btn" onclick="showToast('◎ FEATURE COMING SOON')">EDIT</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">GALACTIC EMAIL</div>
            <div class="setting-val">${user.email}</div>
          </div>
          <button class="nav-btn" onclick="showToast('◎ FEATURE COMING SOON')">EDIT</button>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">ACCESS CODE</div>
            <div class="setting-val">••••••••••••</div>
          </div>
          <button class="nav-btn" onclick="showToast('◎ FEATURE COMING SOON')">CHANGE</button>
        </div>
        <div class="setting-row danger">
          <div>
            <div class="setting-label">LOGOUT ALL SESSIONS</div>
            <div class="setting-val" style="color:var(--muted)">Sign out from all devices</div>
          </div>
          <button class="nav-btn" style="border-color:var(--red);color:var(--red)" onclick="Auth.logout();renderProfilePage()">LOGOUT</button>
        </div>
      </div>

    </div>
  `;
}

/* ── FORM HANDLERS ── */
function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-register').classList.toggle('active', tab==='register');
  document.getElementById('auth-form-login').style.display    = tab==='login'    ? 'block':'none';
  document.getElementById('auth-form-register').style.display = tab==='register' ? 'block':'none';
}

function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '●' : '◎';
}

function _setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn._orig = btn.textContent;
    btn.textContent = '⏳ PROCESSING...';
    btn.style.opacity = '0.7';
  } else {
    btn.textContent = btn._orig || btn.textContent;
    btn.style.opacity = '';
  }
}

function _showError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = '⚠ ' + msg.toUpperCase();
  el.style.display = 'block';
  setTimeout(() => { el.style.display='none'; }, 5000);
}

async function handleLogin() {
  const username = (document.getElementById('login-username')||{}).value?.trim();
  const password = (document.getElementById('login-password')||{}).value;
  if (!username || !password) { _showError('login-error','Fill in all fields'); return; }
  _setLoading('login-btn', true);
  try {
    await Auth.login(username, password);
    renderProfilePage();
  } catch(e) {
    _showError('login-error', e.message);
  } finally {
    _setLoading('login-btn', false);
  }
}

async function handleRegister() {
  const username = (document.getElementById('reg-username')||{}).value?.trim();
  const email    = (document.getElementById('reg-email')||{}).value?.trim();
  const password = (document.getElementById('reg-password')||{}).value;
  const confirm  = (document.getElementById('reg-confirm')||{}).value;

  if (!username||!email||!password||!confirm) { _showError('reg-error','Fill in all fields'); return; }
  if (username.length < 3) { _showError('reg-error','Username must be at least 3 characters'); return; }
  if (password.length < 8) { _showError('reg-error','Password must be at least 8 characters'); return; }
  if (password !== confirm) { _showError('reg-error','Passwords do not match'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { _showError('reg-error','Invalid email address'); return; }

  _setLoading('reg-btn', true);
  try {
    await Auth.register(username, email, password);
    renderProfilePage();
  } catch(e) {
    _showError('reg-error', e.message);
  } finally {
    _setLoading('reg-btn', false);
  }
}
