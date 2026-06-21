// ═══════════════════════════════════════
//  GALACTIC SHIPYARD — THREE.JS SCENES v6
//  All 4 ships in hangar with GLB
// ═══════════════════════════════════════

/* ── BACKGROUND STARFIELD ── */
const BG = (() => {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let stars = [], nebulae = [], W, H, mouseX = 0, mouseY = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({ length: 350 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.5+0.2,
      phase: Math.random()*Math.PI*2,
      speed: Math.random()*0.4+0.1,
      drift: (Math.random()-0.5)*0.05,
    }));
    nebulae = [
      { x:W*0.7,  y:H*0.3,  r:W*0.35, color:[21,101,255],  alpha:0.06  },
      { x:W*0.15, y:H*0.65, r:W*0.28, color:[124,77,255],  alpha:0.045 },
      { x:W*0.5,  y:H*0.8,  r:W*0.2,  color:[0,229,255],   alpha:0.025 },
    ];
  }

  function draw() {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#02040A'; ctx.fillRect(0,0,W,H);
    const px=(mouseX/W-0.5)*30, py=(mouseY/H-0.5)*20;
    nebulae.forEach(n=>{
      const g=ctx.createRadialGradient(n.x+px*0.3,n.y+py*0.3,0,n.x+px*0.3,n.y+py*0.3,n.r);
      g.addColorStop(0,`rgba(${n.color},${n.alpha})`); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    });
    stars.forEach(s=>{
      s.phase+=s.speed*0.008; s.x+=s.drift;
      if(s.x>W+2)s.x=-2; if(s.x<-2)s.x=W+2;
      const b=Math.sin(s.phase)*0.4+0.6;
      ctx.beginPath(); ctx.arc(s.x+px*0.1,s.y+py*0.1,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,230,250,${b})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  document.addEventListener('mousemove',e=>{ mouseX=e.clientX; mouseY=e.clientY; });
  window.addEventListener('resize', resize);
  resize(); requestAnimationFrame(draw);
})();

/* ══════════════════════════════════════
   GLB CACHE & UTILS
══════════════════════════════════════ */
const _glbCache = {};

function loadGLB(path, onSuccess, onProgress, onError) {
  const Loader = window.THREE && THREE.GLTFLoader;
  if (!Loader) { onError(new Error('GLTFLoader missing')); return; }
  if (_glbCache[path]) { onSuccess(_glbCache[path].clone()); return; }
  new Loader().load(path,
    gltf => { _glbCache[path] = gltf.scene; onSuccess(gltf.scene.clone()); },
    onProgress, onError
  );
}

function fixMaterials(obj) {
  obj.traverse(child => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => {
      if (!m) return;
      if (m.emissive) m.emissive.set(0x000000);
      m.emissiveIntensity = 0;
      if (m.color) {
        const h={}; m.color.getHSL(h);
        if (h.l < 0.14) m.color.setHSL(h.h, h.s*0.4, 0.2);
      }
      m.needsUpdate = true;
    });
  });
}

// padding: меньше = корабль крупнее
function autoFit(THREE, camera, obj, pad) {
  pad = pad || 1.4;
  const box  = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const ctr  = box.getCenter(new THREE.Vector3());
  obj.position.sub(ctr);

  const maxDim = Math.max(size.x, size.y, size.z);
  const dist   = (maxDim/2) / Math.tan(camera.fov*Math.PI/360) * pad;

  camera.near = maxDim * 0.0005;
  camera.far  = maxDim * 400;
  camera.updateProjectionMatrix();
  camera.position.set(0, maxDim*0.12, dist);
  camera.lookAt(0,0,0);

  console.log(`[GS] ${obj.name||'model'} maxDim=${maxDim.toFixed(0)} dist=${dist.toFixed(0)}`);
  return maxDim;
}

function neutralLights(THREE, scene) {
  scene.add(new THREE.AmbientLight(0xbcccdd, 1.2));
  const top = new THREE.DirectionalLight(0xffffff, 1.8); top.position.set(0,1,0.6); scene.add(top);
  const frt = new THREE.DirectionalLight(0xddeeff, 1.2); frt.position.set(0,0.2,1);  scene.add(frt);
  const lft = new THREE.DirectionalLight(0x99aacc, 0.6); lft.position.set(-1,0.3,0); scene.add(lft);
  const rgt = new THREE.DirectionalLight(0x99aacc, 0.6); rgt.position.set(1,0.3,0);  scene.add(rgt);
  const bot = new THREE.DirectionalLight(0x001133, 0.2); bot.position.set(0,-1,0);   scene.add(bot);
}

/* ══════════════════════════════════════
   HERO SHIP (главная страница)
══════════════════════════════════════ */
const HeroShip = (() => {
  let renderer, scene, camera, shipGroup, animFrame;
  let mx=0, my=0, maxDim=300;

  function init() {
    const canvas = document.getElementById('ship-canvas');
    if (!canvas || !window.THREE) return;

    renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;

    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, canvas.clientWidth/canvas.clientHeight, 1, 999999);
    camera.position.set(0, 400, 1800); camera.lookAt(0,0,0);

    neutralLights(THREE, scene);

    // Частицы-звёзды в 3D сцене
    const pts = [];
    for(let i=0;i<600;i++) pts.push((Math.random()-.5)*80000,(Math.random()-.5)*40000,(Math.random()-.5)*80000);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
    scene.add(new THREE.Points(pg, new THREE.PointsMaterial({color:0x88bbff,size:5,transparent:true,opacity:0.55})));

    // Лоадер
    const ldr = makeHeroLoader(canvas.parentElement);

    // X-Wing на главном экране (id=2), fallback на первый доступный
    const heroShip = SHIPS.find(s=>s.id===2 && s.glb) || SHIPS.find(s=>s.glb) || null;
    if (!heroShip) { removeLdr(ldr); animate(); return; }

    loadGLB(heroShip.glb,
      model => {
        shipGroup = model;
        fixMaterials(shipGroup);
        scene.add(shipGroup);
        maxDim = autoFit(THREE, camera, shipGroup, 1.1);
        removeLdr(ldr);
      },
      p => { if(p.total>0){ const el=document.getElementById('hero-ldr-txt'); if(el) el.textContent=`LOADING MODEL · ${Math.round(p.loaded/p.total*100)}%`; } },
      err => { console.warn('[Hero] GLB fail:', err.message); removeLdr(ldr); }
    );

    animate();
  }

  function makeHeroLoader(parent) {
    const el = document.createElement('div');
    el.style.cssText=`position:absolute;top:50%;right:25%;transform:translate(50%,-50%);
      display:flex;flex-direction:column;align-items:center;gap:10px;
      font-family:'Orbitron',monospace;font-size:.58rem;letter-spacing:3px;
      color:rgba(0,229,255,.7);pointer-events:none;z-index:10;`;
    el.innerHTML=`<div class="loader-ring"></div><div id="hero-ldr-txt">LOADING MODEL · 0%</div>`;
    parent.style.position='relative'; parent.appendChild(el);
    return el;
  }

  function removeLdr(el) {
    if(!el)return;
    el.style.transition='opacity .5s'; el.style.opacity='0';
    setTimeout(()=>el&&el.remove(), 550);
  }

  function animate() {
    animFrame = requestAnimationFrame(animate);
    if (shipGroup) {
      shipGroup.rotation.y += 0.002;
      shipGroup.rotation.x += (my*0.03 - shipGroup.rotation.x)*0.04;
      shipGroup.position.y = Math.sin(Date.now()*0.0005)*(maxDim*0.02);
    }
    if (camera && maxDim>0) {
      camera.position.x += (mx*maxDim*0.12 - camera.position.x)*0.03;
      camera.lookAt(0,0,0);
    }
    renderer && renderer.render(scene, camera);
  }

  document.addEventListener('mousemove', e=>{
    mx=(e.clientX/window.innerWidth -0.5)*2;
    my=(e.clientY/window.innerHeight-0.5)*2;
  });

  return { init, stop:()=>cancelAnimationFrame(animFrame) };
})();

/* ══════════════════════════════════════
   HANGAR SCENE
══════════════════════════════════════ */
const HangarScene = (() => {
  let renderer, scene, camera, shipGroup, animFrame;
  let dragging=false, lastX=0, rotY=0, inited=false;
  let currentShipId = null;

  // Настройки зума для каждого корабля
  // меньше pad = корабль крупнее в кадре
  const SHIP_PAD = {
    1: 0.62,   // Star Destroyer — длинный, чуть отдаляем
    2: 0.58,   // X-Wing — компактный истребитель
    3: 0.52,   // Death Star — сфера, хотим видеть деталь
    4: 0.52,   // TIE Interceptor — маленький, приближаем
    5: 0.60,
  };

  function setupLights() {
    scene.add(new THREE.AmbientLight(0xbcccdd, 1.1));
    const key  = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(0.5,1,0.7);   scene.add(key);
    const fill = new THREE.DirectionalLight(0x99ccff, 0.9); fill.position.set(-0.6,0.2,0.4); scene.add(fill);
    const bot  = new THREE.DirectionalLight(0x001133, 0.2); bot.position.set(0,-1,0);        scene.add(bot);
    // Акцентный cyan сверху
    const c1 = new THREE.PointLight(0x00E5FF, 0.8, 99999); c1.position.set(0,1,0.5);  scene.add(c1);
    const c2 = new THREE.PointLight(0x0033aa, 0.4, 99999); c2.position.set(0,-0.5,-1); scene.add(c2);
  }

  function buildGrid(maxDim) {
    scene.children.filter(c=>c._hangarFloor).forEach(c=>scene.remove(c));
    const size = maxDim * 2.8;
    const grid = new THREE.GridHelper(size, 30, 0x00E5FF, 0x081525);
    grid.position.y = -maxDim*0.48; grid._hangarFloor=true; scene.add(grid);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(size*0.45, size*0.45),
      new THREE.MeshBasicMaterial({color:0x00E5FF,transparent:true,opacity:0.018})
    );
    glow.rotation.x=-Math.PI/2; glow.position.y=-maxDim*0.475; glow._hangarFloor=true;
    scene.add(glow);
  }

  function showOverlay(html) {
    let el = document.getElementById('hng-overlay');
    const wrap = document.getElementById('hangar-canvas') && document.getElementById('hangar-canvas').parentElement;
    if (!wrap) return;
    if (!el) {
      el=document.createElement('div'); el.id='hng-overlay';
      el.style.cssText=`position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        font-family:'Orbitron',monospace;font-size:.7rem;letter-spacing:4px;
        color:rgba(0,229,255,.55);pointer-events:none;z-index:10;text-align:center;line-height:1.8;`;
      wrap.style.position='relative'; wrap.appendChild(el);
    }
    el.innerHTML=html; el.style.display=html?'block':'none';
  }

  function loadShip(ship) {
    if (!scene) return;
    if (shipGroup) { scene.remove(shipGroup); shipGroup=null; }
    currentShipId = ship.id;

    if (!ship.glb) {
      // Заглушка для кораблей без модели
      const g=new THREE.Group();
      const mat=new THREE.MeshPhongMaterial({color:ship.color,transparent:true,opacity:0.3,wireframe:false});
      const wir=new THREE.MeshBasicMaterial({color:ship.color,wireframe:true,transparent:true,opacity:0.2});
      const geo=new THREE.IcosahedronGeometry(1,2);
      g.add(new THREE.Mesh(geo,mat)); g.add(new THREE.Mesh(geo,wir));
      shipGroup=g; scene.add(shipGroup);
      autoFit(THREE,camera,shipGroup,1.2); buildGrid(3);
      showOverlay('COMING SOON<br><span style="font-size:.5rem;color:rgba(0,229,255,.3);letter-spacing:3px">MODEL IN PRODUCTION</span>');
      return;
    }

    showOverlay(`<div class="loader-ring" style="margin:0 auto 10px;width:28px;height:28px;border-width:2px"></div>LOADING VESSEL...`);

    loadGLB(ship.glb,
      model => {
        if (currentShipId !== ship.id) return; // пользователь переключился пока грузилось
        shipGroup = model;
        fixMaterials(shipGroup);
        scene.add(shipGroup);
        const pad = SHIP_PAD[ship.id] || 0.60;
        const md  = autoFit(THREE, camera, shipGroup, pad);
        buildGrid(md);
        showOverlay('');
        console.log(`[Hangar] ${ship.name} loaded, pad=${pad}`);
      },
      null,
      err => {
        console.warn(`[Hangar] ${ship.name} GLB fail:`, err.message);
        showOverlay(`MODEL NOT FOUND<br><span style="font-size:.5rem;color:rgba(0,229,255,.3);letter-spacing:3px">ADD FILE TO /MODELS/</span>`);
      }
    );
  }

  function init(shipId) {
    const canvas = document.getElementById('hangar-canvas');
    if (!canvas || !window.THREE) return;

    if (!inited) {
      renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      renderer.toneMapping = THREE.NoToneMapping;

      scene  = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, canvas.clientWidth/canvas.clientHeight, 0.1, 9999999);
      camera.position.set(0,0,800); camera.lookAt(0,0,0);

      setupLights();

      // Управление
      canvas.style.cursor='grab';
      canvas.addEventListener('mousedown',  e=>{dragging=true;lastX=e.clientX;canvas.style.cursor='grabbing';});
      window.addEventListener('mousemove',  e=>{if(dragging){rotY+=(e.clientX-lastX)*0.007;lastX=e.clientX;}});
      window.addEventListener('mouseup',    ()=>{dragging=false;canvas.style.cursor='grab';});
      canvas.addEventListener('touchstart', e=>{dragging=true;lastX=e.touches[0].clientX;},{passive:true});
      window.addEventListener('touchmove',  e=>{if(dragging){rotY+=(e.touches[0].clientX-lastX)*0.007;lastX=e.touches[0].clientX;}},{passive:true});
      window.addEventListener('touchend',   ()=>dragging=false);

      // Скролл для зума
      canvas.addEventListener('wheel', e=>{
        e.preventDefault();
        const factor = 1 + e.deltaY*0.001;
        camera.position.z = Math.max(camera.near*20, camera.position.z * factor);
        camera.lookAt(0,0,0);
      },{passive:false});

      // Анимация
      function loop() {
        animFrame = requestAnimationFrame(loop);
        if (shipGroup) {
          shipGroup.rotation.y = rotY + (dragging?0:Date.now()*0.00018);
          shipGroup.position.y = Math.sin(Date.now()*0.0007)*0.4;
        }
        renderer && renderer.render(scene, camera);
      }
      loop();
      inited = true;
    }

    const ship = SHIPS.find(s=>s.id===shipId) || SHIPS[0];
    loadShip(ship);
  }

  return { init };
})();

/* ══════════════════════════════════════
   PRODUCT MINI-3D
══════════════════════════════════════ */
function makeProductCanvas(canvasEl, colorHex) {
  if (!window.THREE || !canvasEl) return;
  const r = new THREE.WebGLRenderer({canvas:canvasEl,alpha:true,antialias:true});
  const w=canvasEl.clientWidth||240, h=canvasEl.clientHeight||160;
  r.setSize(w,h); r.setPixelRatio(Math.min(devicePixelRatio,1.5));
  r.toneMapping = THREE.NoToneMapping;

  const s=new THREE.Scene(), cam=new THREE.PerspectiveCamera(50,w/h,0.1,100);
  cam.position.z=3.2;
  const grp=new THREE.Group();
  const mat=new THREE.MeshPhongMaterial({color:colorHex,emissive:colorHex,emissiveIntensity:0.1,shininess:120});
  const wir=new THREE.MeshBasicMaterial({color:colorHex,wireframe:true,transparent:true,opacity:0.14});
  const SHAPES=[
    new THREE.TorusGeometry(0.55,0.14,16,40),
    new THREE.IcosahedronGeometry(0.55,1),
    new THREE.OctahedronGeometry(0.55,1),
    new THREE.TorusKnotGeometry(0.38,0.12,64,8),
    new THREE.BoxGeometry(0.7,0.7,0.7),
    new THREE.ConeGeometry(0.45,1,8),
  ];
  const idx=Math.floor(Math.random()*SHAPES.length);
  grp.add(new THREE.Mesh(SHAPES[idx],mat));
  grp.add(new THREE.Mesh(SHAPES[idx],wir));
  const rp=[];
  for(let i=0;i<60;i++){const a=(i/60)*Math.PI*2;rp.push(Math.cos(a)*1.1,(Math.random()-.5)*.1,Math.sin(a)*1.1);}
  const rg=new THREE.BufferGeometry();
  rg.setAttribute('position',new THREE.Float32BufferAttribute(rp,3));
  grp.add(new THREE.Points(rg,new THREE.PointsMaterial({color:colorHex,size:0.04})));
  s.add(grp);
  s.add(new THREE.AmbientLight(0x888888,1));
  const l1=new THREE.PointLight(colorHex,2,8); l1.position.set(2,2,2); s.add(l1);
  const l2=new THREE.PointLight(0xffffff,0.4,6); l2.position.set(-2,-1,1); s.add(l2);

  let running=true;
  function loop(){if(!running)return;requestAnimationFrame(loop);grp.rotation.y+=0.018;grp.rotation.x+=0.004;r.render(s,cam);}
  loop();
  const obs=new MutationObserver(()=>{if(!document.body.contains(canvasEl)){running=false;obs.disconnect();}});
  obs.observe(document.body,{childList:true,subtree:true});
}

/* ── CARGO MINI-3D ── */
function makeCargoCanvas(canvasEl, colorHex) {
  if (!window.THREE || !canvasEl) return;
  const r=new THREE.WebGLRenderer({canvas:canvasEl,alpha:true,antialias:true});
  r.setSize(52,52); r.toneMapping=THREE.NoToneMapping;
  const s=new THREE.Scene(), cam=new THREE.PerspectiveCamera(50,1,0.1,100);
  cam.position.z=2.2;
  const mesh=new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.7,1),
    new THREE.MeshPhongMaterial({color:colorHex,emissive:colorHex,emissiveIntensity:0.25})
  );
  s.add(mesh);
  s.add(new THREE.AmbientLight(0xffffff,0.6));
  const pl=new THREE.PointLight(colorHex,2,6); pl.position.set(2,2,2); s.add(pl);
  function loop(){requestAnimationFrame(loop);mesh.rotation.y+=0.03;r.render(s,cam);}
  loop();
}
