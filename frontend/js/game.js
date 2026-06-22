// ═══════════════════════════════════════
//  GALACTIC SHIPYARD — SPACE FLIGHT GAME
//  Open-world space explorer
// ═══════════════════════════════════════

const SpaceGame = (() => {

  // ── STATE ──
  let canvas, renderer, scene, camera;
  let ship, shipPivot;
  let animFrame, running = false;
  let shipModel = null;

  // Controls
  const keys = {};
  let mouseX = 0, mouseY = 0;
  let pitchVel = 0, yawVel = 0, rollVel = 0;
  let speed = 0, maxSpeed = 12, boost = false;

  // HUD data
  let health = 100, shields = 100, fuel = 100;
  let score = 0, credits = 0;
  let nearestBody = '';
  let warpCooldown = 0;

  // World objects
  const planets = [], asteroids = [], blackHoles = [], nebulaClouds = [], stars3D = [];
  let starField;

  // Collision / proximity
  const PLANET_PULL_DIST = 800;
  const BLACKHOLE_KILL   = 180;
  const BLACKHOLE_PULL   = 1200;

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  function init(canvasEl, glbScene) {
    canvas = canvasEl;
    shipModel = glbScene || null;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x00000a, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x00000a, 0.000018);

    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.5, 80000);

    buildLights();
    buildStarField();
    buildShip();
    buildWorld();
    setupControls();

    running = true;
    gameLoop();
    updateHUD();
  }

  /* ── LIGHTS ── */
  function buildLights() {
    scene.add(new THREE.AmbientLight(0x111133, 0.6));
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.0);
    sun.position.set(5000, 2000, -3000);
    scene.add(sun);
    // Distant star glow
    const starGlow = new THREE.PointLight(0x4488ff, 0.4, 30000);
    starGlow.position.set(-8000, 3000, -5000);
    scene.add(starGlow);
  }

  /* ── STARFIELD ── */
  function buildStarField() {
    const positions = [], colors = [];
    for (let i = 0; i < 8000; i++) {
      const r = 30000 + Math.random() * 20000;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      // Slightly varied star colors
      const t = Math.random();
      if (t < 0.3)      colors.push(0.7, 0.8, 1.0);   // blue-white
      else if (t < 0.6) colors.push(1.0, 1.0, 1.0);   // white
      else if (t < 0.8) colors.push(1.0, 0.9, 0.7);   // yellow-white
      else              colors.push(1.0, 0.6, 0.4);   // orange
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    starField = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 3.5, vertexColors: true, transparent: true, opacity: 0.9,
      sizeAttenuation: false,
    }));
    scene.add(starField);
  }

  /* ── SHIP ── */
  function buildShip() {
    shipPivot = new THREE.Group();
    scene.add(shipPivot);

    if (shipModel) {
      ship = shipModel.clone();
      // Fix materials
      ship.traverse(c => {
        if (!c.isMesh) return;
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(m => { if (m.emissive) m.emissive.set(0); m.emissiveIntensity = 0; m.needsUpdate = true; });
      });
      // Fit to ~20 units
      const box = new THREE.Box3().setFromObject(ship);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) ship.scale.setScalar(20 / maxDim);
      const ctr = box.getCenter(new THREE.Vector3());
      ship.position.sub(ctr.multiplyScalar(20 / maxDim));
      // Rotate to face forward (Z-)
      ship.rotation.y = Math.PI;
    } else {
      // Procedural fallback ship
      ship = buildProceduralShip();
    }

    shipPivot.add(ship);

    // Engine glow lights
    const eng1 = new THREE.PointLight(0x00aaff, 2, 80);
    eng1.position.set(0, 0, 12); eng1.name = 'eng';
    const eng2 = new THREE.PointLight(0x0044ff, 1, 40);
    eng2.position.set(0, 0, 14); eng2.name = 'eng';
    shipPivot.add(eng1); shipPivot.add(eng2);

    // Camera: behind and above ship
    camera.position.set(0, 8, 60);
    shipPivot.add(camera);
  }

  function buildProceduralShip() {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshPhongMaterial({ color: 0x8eaccd, shininess: 80 });
    const accentMat = new THREE.MeshPhongMaterial({ color: 0xcc2200 });
    const glassMat  = new THREE.MeshPhongMaterial({ color: 0x00e5ff, emissive: 0x002233, transparent: true, opacity: 0.7 });
    const engMat    = new THREE.MeshPhongMaterial({ color: 0x00aaff, emissive: 0x0044ff, emissiveIntensity: 1 });

    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 4.5, 10), hullMat);
    fus.rotation.z = Math.PI / 2; g.add(fus);
    const ck = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 8, 0, Math.PI*2, 0, Math.PI/2), glassMat);
    ck.position.set(-1.7, 0.26, 0); ck.rotation.z = Math.PI / 2; g.add(ck);
    [[-1,1,1],[-1,-1,1],[-1,1,-1],[-1,-1,-1]].forEach(([x,y,z]) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.4), hullMat);
      w.position.set(x * 0.3, y * 0.06, z * 1.15); g.add(w);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.085, 0.18), accentMat);
      stripe.position.set(x * 0.7, y * 0.065, z * 1.15); g.add(stripe);
      const em = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.7, 8), engMat);
      em.rotation.z = Math.PI / 2; em.position.set(2.1, y * 0.06, z * 1.15); g.add(em);
    });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), hullMat);
    nose.rotation.z = -Math.PI / 2; nose.position.set(-2.55, 0, 0); g.add(nose);
    g.rotation.y = Math.PI;
    return g;
  }

  /* ══════════════════════════════════════
     WORLD BUILDING
  ══════════════════════════════════════ */
  function buildWorld() {
    buildPlanets();
    buildAsteroids();
    buildBlackHoles();
    buildNebulae();
    buildSpaceStation();
  }

  /* ── PLANETS ── */
  const PLANET_CONFIGS = [
    { name: 'TATOOINE',     pos: [3000, -200, -4000],  r: 400, color: 0xc8a060, ring: false, atm: 0xffcc88, glow: 0xffaa44 },
    { name: 'HOTH',         pos: [-5000, 500, -2000],  r: 320, color: 0xddeeff, ring: false, atm: 0xaaddff, glow: 0x88ccff },
    { name: 'ENDOR',        pos: [2000, 800, 5000],    r: 380, color: 0x2d6e2d, ring: false, atm: 0x44cc44, glow: 0x22aa22 },
    { name: 'MUSTAFAR',     pos: [-3500, -300, 6000],  r: 280, color: 0x8b1a00, ring: false, atm: 0xff4400, glow: 0xff2200 },
    { name: 'CORUSCANT',    pos: [8000, 200, -1000],   r: 500, color: 0x445566, ring: false, atm: 0x8899bb, glow: 0x4466aa },
    { name: 'BESPIN',       pos: [-1000, 1000, -8000], r: 600, color: 0xcc8833, ring: true,  atm: 0xffaa55, glow: 0xff8800 },
    { name: 'DAGOBAH',      pos: [6000, -500, 4000],   r: 250, color: 0x1a3a1a, ring: false, atm: 0x336633, glow: 0x224422 },
    { name: 'KAMINO',       pos: [-7000, 0, -4000],    r: 300, color: 0x1155aa, ring: false, atm: 0x2288ff, glow: 0x0055cc },
  ];

  function buildPlanets() {
    PLANET_CONFIGS.forEach(cfg => {
      const geo  = new THREE.SphereGeometry(cfg.r, 48, 48);
      const mat  = new THREE.MeshPhongMaterial({ color: cfg.color, shininess: 15 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);

      // Surface detail (bump-like patches)
      addSurfaceDetail(mesh, cfg);

      // Atmosphere glow
      const atmGeo = new THREE.SphereGeometry(cfg.r * 1.06, 32, 32);
      const atmMat = new THREE.MeshBasicMaterial({
        color: cfg.atm, transparent: true, opacity: 0.18, side: THREE.BackSide
      });
      mesh.add(new THREE.Mesh(atmGeo, atmMat));

      // Outer glow
      const glowGeo = new THREE.SphereGeometry(cfg.r * 1.18, 24, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: cfg.glow, transparent: true, opacity: 0.06, side: THREE.BackSide
      });
      mesh.add(new THREE.Mesh(glowGeo, glowMat));

      // Ring system (Bespin)
      if (cfg.ring) {
        const ringGeo = new THREE.RingGeometry(cfg.r * 1.4, cfg.r * 2.2, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xcc9955, transparent: true, opacity: 0.45,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.8;
        mesh.add(ring);
      }

      // Point light from planet
      const pLight = new THREE.PointLight(cfg.glow, 0.8, cfg.r * 5);
      pLight.position.set(...cfg.pos);
      scene.add(pLight);

      scene.add(mesh);
      planets.push({ mesh, cfg, rotSpeed: (Math.random() * 0.0005 + 0.0001) });
    });
  }

  function addSurfaceDetail(planet, cfg) {
    // Add small bumps/craters on surface
    for (let i = 0; i < 6; i++) {
      const bumpR = cfg.r * (0.06 + Math.random() * 0.1);
      const bump  = new THREE.Mesh(
        new THREE.SphereGeometry(bumpR, 8, 8),
        new THREE.MeshPhongMaterial({ color: new THREE.Color(cfg.color).multiplyScalar(0.7) })
      );
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      bump.position.set(
        cfg.r * 0.98 * Math.sin(phi) * Math.cos(theta),
        cfg.r * 0.98 * Math.cos(phi),
        cfg.r * 0.98 * Math.sin(phi) * Math.sin(theta),
      );
      planet.add(bump);
    }
  }

  /* ── BLACK HOLES ── */
  function buildBlackHoles() {
    const BH_POSITIONS = [
      [-10000, 0, -10000],
      [12000, -1000, 8000],
    ];
    BH_POSITIONS.forEach(pos => {
      const group = new THREE.Group();
      group.position.set(...pos);

      // Event horizon (dark sphere)
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(200, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      group.add(core);

      // Accretion disk
      const diskGeo = new THREE.RingGeometry(240, 600, 64);
      const diskMat = new THREE.MeshBasicMaterial({
        color: 0xff4400, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
      });
      const disk = new THREE.Mesh(diskGeo, diskMat);
      disk.rotation.x = Math.PI / 2.2;
      group.add(disk);

      // Outer glow rings
      [800, 1100, 1500].forEach((r, i) => {
        const rg = new THREE.RingGeometry(r, r + 40, 64);
        const rm = new THREE.MeshBasicMaterial({
          color: i === 0 ? 0xff6600 : i === 1 ? 0xff2200 : 0xaa0066,
          transparent: true, opacity: 0.25 - i * 0.07, side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(rg, rm);
        ring.rotation.x = Math.PI / 2.2;
        group.add(ring);
      });

      // Lensing glow
      const lensGeo = new THREE.SphereGeometry(700, 24, 24);
      const lensMat = new THREE.MeshBasicMaterial({
        color: 0x220011, transparent: true, opacity: 0.5, side: THREE.BackSide,
      });
      group.add(new THREE.Mesh(lensGeo, lensMat));

      scene.add(group);
      blackHoles.push({ group, pos: new THREE.Vector3(...pos), disk });
    });
  }

  /* ── ASTEROIDS ── */
  function buildAsteroids() {
    const BELTS = [
      { center: [0, 0, 0], count: 120, spread: 4000, ySpread: 300 },
      { center: [5000, 500, 3000], count: 60, spread: 1500, ySpread: 200 },
    ];
    const rockMats = [
      new THREE.MeshPhongMaterial({ color: 0x665544, shininess: 5 }),
      new THREE.MeshPhongMaterial({ color: 0x554433, shininess: 5 }),
      new THREE.MeshPhongMaterial({ color: 0x776655, shininess: 5 }),
    ];
    const rockGeos = [
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 1),
    ];

    BELTS.forEach(belt => {
      for (let i = 0; i < belt.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = belt.spread * 0.4 + Math.random() * belt.spread * 0.6;
        const size  = 8 + Math.random() * 40;
        const geo   = rockGeos[Math.floor(Math.random() * 3)].clone();
        const mat   = rockMats[Math.floor(Math.random() * 3)];
        const mesh  = new THREE.Mesh(geo, mat);

        mesh.position.set(
          belt.center[0] + Math.cos(angle) * dist + (Math.random()-0.5) * 300,
          belt.center[1] + (Math.random()-0.5) * belt.ySpread,
          belt.center[2] + Math.sin(angle) * dist + (Math.random()-0.5) * 300,
        );
        mesh.scale.set(size, size * (0.6 + Math.random()*0.8), size);
        mesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        scene.add(mesh);
        asteroids.push({ mesh, rotSpeed: new THREE.Vector3((Math.random()-.5)*.01,(Math.random()-.5)*.01,(Math.random()-.5)*.01) });
      }
    });
  }

  /* ── NEBULAE ── */
  function buildNebulae() {
    const NEBULA_CONFIGS = [
      { pos: [-6000, 1000, -5000], color: 0x4400aa, scale: 3000 },
      { pos: [9000, -500, 2000],   color: 0xaa2200, scale: 2500 },
      { pos: [0, 2000, -9000],     color: 0x006688, scale: 2000 },
    ];

    NEBULA_CONFIGS.forEach(cfg => {
      for (let i = 0; i < 120; i++) {
        const puffGeo = new THREE.SphereGeometry(60 + Math.random() * 180, 6, 6);
        const puffMat = new THREE.MeshBasicMaterial({
          color: cfg.color,
          transparent: true,
          opacity: 0.025 + Math.random() * 0.04,
        });
        const puff = new THREE.Mesh(puffGeo, puffMat);
        puff.position.set(
          cfg.pos[0] + (Math.random()-.5) * cfg.scale,
          cfg.pos[1] + (Math.random()-.5) * cfg.scale * 0.4,
          cfg.pos[2] + (Math.random()-.5) * cfg.scale,
        );
        scene.add(puff);
        nebulaClouds.push(puff);
      }

      // Nebula core glow
      const coreGeo = new THREE.SphereGeometry(400, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: cfg.color, transparent: true, opacity: 0.12, side: THREE.BackSide,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(...cfg.pos);
      scene.add(core);
    });
  }

  /* ── SPACE STATION ── */
  function buildSpaceStation() {
    const group = new THREE.Group();
    group.position.set(1500, 0, -1500);

    const mat   = new THREE.MeshPhongMaterial({ color: 0x8899aa, shininess: 60 });
    const gMat  = new THREE.MeshPhongMaterial({ color: 0x00E5FF, emissive: 0x003366, emissiveIntensity: 1 });

    // Central hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 120, 16), mat);
    group.add(hub);

    // Rotating ring
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(200, 20, 16, 40),
      new THREE.MeshPhongMaterial({ color: 0x667788, shininess: 40 })
    );
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);

    // Docking arms
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 200), mat);
      arm.rotation.y = (i / 4) * Math.PI * 2;
      arm.position.set(Math.cos((i/4)*Math.PI*2)*100, 0, Math.sin((i/4)*Math.PI*2)*100);
      group.add(arm);
    }

    // Lights on station
    [0x00E5FF, 0xff4400, 0x00E5FF, 0xff4400].forEach((c, i) => {
      const l = new THREE.PointLight(c, 1.5, 300);
      l.position.set(Math.cos((i/4)*Math.PI*2)*210, 0, Math.sin((i/4)*Math.PI*2)*210);
      group.add(l);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(6, 8, 8), new THREE.MeshBasicMaterial({ color: c }));
      beacon.position.copy(l.position);
      group.add(beacon);
    });

    scene.add(group);
    planets.push({ mesh: group, cfg: { name: 'GALACTIC SHIPYARD STATION' }, rotSpeed: 0.0002, isStation: true, ringMesh });
  }

  /* ══════════════════════════════════════
     CONTROLS
  ══════════════════════════════════════ */
  function setupControls() {
    document.addEventListener('keydown', e => { keys[e.code] = true; });
    document.addEventListener('keyup',   e => { keys[e.code] = false; });
  }

  /* ══════════════════════════════════════
     GAME LOOP
  ══════════════════════════════════════ */
  function gameLoop() {
    if (!running) return;
    animFrame = requestAnimationFrame(gameLoop);

    const delta = 0.016; // ~60fps

    updateShipPhysics(delta);
    updateWorld(delta);
    updateProximity();
    updateHUD();

    renderer.render(scene, camera);
  }

  /* ── SHIP PHYSICS ── */
  function updateShipPhysics(delta) {
    if (!shipPivot) return;

    boost = keys['ShiftLeft'] || keys['ShiftRight'];
    const currentMaxSpeed = boost ? maxSpeed * 2.2 : maxSpeed;
    const accel = boost ? 0.35 : 0.18;
    const decel = 0.92;

    // Throttle
    if (keys['KeyW'] || keys['ArrowUp'])   speed = Math.min(speed + accel, currentMaxSpeed);
    else if (keys['KeyS'] || keys['ArrowDown']) speed = Math.max(speed - accel * 0.5, -maxSpeed * 0.3);
    else speed *= decel;

    // Pitch (up/down) — mouse Y or Q/E keys
    const targetPitch = (mouseY * 0.03);
    pitchVel += (targetPitch - pitchVel) * 0.08;
    shipPivot.rotateX(-pitchVel * delta * 30);

    // Yaw (left/right) — A/D or arrow keys
    if (keys['KeyA'] || keys['ArrowLeft'])  yawVel = Math.min(yawVel + 0.002, 0.04);
    else if (keys['KeyD'] || keys['ArrowRight']) yawVel = Math.max(yawVel - 0.002, -0.04);
    else yawVel *= 0.85;
    shipPivot.rotateY(yawVel);

    // Roll — Q/E
    if (keys['KeyQ']) rollVel = Math.min(rollVel + 0.002, 0.04);
    else if (keys['KeyE']) rollVel = Math.max(rollVel - 0.002, -0.04);
    else rollVel *= 0.80;
    shipPivot.rotateZ(rollVel);

    // Move forward in local space
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipPivot.quaternion);
    shipPivot.position.addScaledVector(dir, speed * delta * 60);

    // Engine glow intensity by speed
    shipPivot.children.forEach(c => {
      if (c.name === 'eng') c.intensity = 1 + (speed / maxSpeed) * 2 + (boost ? 2 : 0);
    });

    // Fuel consumption
    if (speed > 0.5) fuel = Math.max(0, fuel - delta * (boost ? 0.8 : 0.2));
    else             fuel = Math.min(100, fuel + delta * 0.5);

    // Bank ship model slightly when turning
    if (ship) {
      ship.rotation.z += (-yawVel * 8 - ship.rotation.z) * 0.1;
    }

    // Camera shake at high speed
    if (boost && speed > 15) {
      camera.position.x = (Math.random()-.5) * 0.6;
      camera.position.y = 8 + (Math.random()-.5) * 0.3;
    } else {
      camera.position.x += (0 - camera.position.x) * 0.1;
      camera.position.y += (8 - camera.position.y) * 0.1;
    }
  }

  /* ── WORLD UPDATE ── */
  function updateWorld(delta) {
    const t = Date.now() * 0.001;

    // Rotate planets
    planets.forEach(p => {
      if (p.mesh) {
        p.mesh.rotation.y += p.rotSpeed;
        if (p.ringMesh) p.ringMesh.rotation.z += p.rotSpeed * 0.5;
      }
    });

    // Rotate asteroids
    asteroids.forEach(a => {
      a.mesh.rotation.x += a.rotSpeed.x;
      a.mesh.rotation.y += a.rotSpeed.y;
      a.mesh.rotation.z += a.rotSpeed.z;
    });

    // Spin black hole disks
    blackHoles.forEach(bh => {
      bh.disk.rotation.z += 0.008;
      bh.group.rotation.y += 0.001;
    });

    // Warp cooldown
    if (warpCooldown > 0) warpCooldown -= delta;
  }

  /* ── PROXIMITY / GRAVITY ── */
  function updateProximity() {
    if (!shipPivot) return;
    const shipPos = shipPivot.position;
    nearestBody = '';
    let minDist = Infinity;

    // Planets — display name
    planets.forEach(p => {
      const d = shipPos.distanceTo(p.mesh.position);
      if (d < minDist) { minDist = d; nearestBody = p.cfg.name || 'STATION'; }
    });

    // Black hole gravity
    blackHoles.forEach(bh => {
      const d = shipPos.distanceTo(bh.pos);
      if (d < BLACKHOLE_PULL) {
        const pull = (1 - d / BLACKHOLE_PULL) * 0.8;
        const dir = bh.pos.clone().sub(shipPos).normalize();
        shipPivot.position.addScaledVector(dir, pull);
        shields = Math.max(0, shields - pull * 0.5);
        if (d < BLACKHOLE_KILL) {
          health = 0;
          triggerDeath('DESTROYED BY BLACK HOLE');
        }
      }
    });

    // Health regen when shields up
    if (shields > 30) health = Math.min(100, health + 0.02);
    shields = Math.min(100, shields + 0.01);
  }

  function triggerDeath(reason) {
    if (!running) return;
    const el = document.getElementById('game-death');
    if (el) {
      el.style.display = 'flex';
      document.getElementById('game-death-reason') && (document.getElementById('game-death-reason').textContent = reason);
    }
    speed = 0; health = 100; shields = 100;
    shipPivot.position.set(0, 0, 0);
    shipPivot.rotation.set(0, 0, 0);
    if (el) setTimeout(() => el.style.display = 'none', 3000);
  }

  /* ── HUD UPDATE ── */
  function updateHUD() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setW = (id, pct, color) => {
      const el = document.getElementById(id);
      if (el) { el.style.width = pct + '%'; if (color) el.style.background = color; }
    };

    const spd = Math.abs(speed / maxSpeed * 100).toFixed(0);
    set('hud-speed',      spd + ' %');
    set('hud-speed-big',  spd);
    set('hud-health',     health.toFixed(0) + '%');
    set('hud-shields',    shields.toFixed(0) + '%');
    set('hud-fuel-pct',   fuel.toFixed(0) + '%');
    set('hud-nearest',  nearestBody || '—');
    set('hud-coords',   `${shipPivot ? shipPivot.position.x.toFixed(0) : 0} : ${shipPivot ? shipPivot.position.z.toFixed(0) : 0}`);
    set('hud-fuel',     fuel.toFixed(0) + '%');
    set('hud-mode',     boost ? 'BOOST' : speed > 0.5 ? 'CRUISE' : 'IDLE');

    setW('bar-health',  health,  health > 60 ? 'var(--green)' : health > 30 ? 'var(--orange)' : 'var(--red)');
    setW('bar-shields', shields, shields > 40 ? 'var(--cyan)' : 'var(--orange)');
    setW('bar-fuel',    fuel,    fuel > 30 ? 'var(--blue)' : 'var(--red)');
    setW('bar-speed',   spd,     boost ? 'var(--orange)' : 'var(--cyan)');
  }

  /* ── MOUSE LOOK ── */
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
    mouseY = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
  }

  /* ── RESIZE ── */
  function resize() {
    if (!renderer || !canvas) return;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  /* ── WARP (teleport to planet) ── */
  function warpTo(planetName) {
    if (!shipPivot || warpCooldown > 0) return;
    const planet = planets.find(p => p.cfg && p.cfg.name === planetName);
    if (!planet) return;
    const pos = planet.mesh.position.clone();
    const offset = pos.clone().normalize().negate().multiplyScalar((planet.cfg.r || 200) * 2.5 + 800);
    shipPivot.position.copy(pos).add(offset);
    shipPivot.lookAt(pos);
    speed = 0; warpCooldown = 10;
    showToast(`⚡ WARPED TO ${planetName}`);
  }

  /* ── CLEANUP ── */
  function destroy() {
    running = false;
    cancelAnimationFrame(animFrame);
    document.removeEventListener('keydown', e => { keys[e.code] = true; });
    document.removeEventListener('keyup',   e => { keys[e.code] = false; });
    if (renderer) { renderer.dispose(); renderer = null; }
    // Clear arrays
    planets.length = 0; asteroids.length = 0;
    blackHoles.length = 0; nebulaClouds.length = 0;
  }

  /* ── PUBLIC ── */
  return {
    init,
    destroy,
    resize,
    onMouseMove,
    warpTo,
    getPlanets: () => PLANET_CONFIGS.map(p => p.name),
  };
})();
