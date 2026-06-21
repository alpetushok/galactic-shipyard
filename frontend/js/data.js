// ═══════════════════════════════════════
//  GALACTIC SHIPYARD — DATA
// ═══════════════════════════════════════

const PRODUCTS = [
  {
    id: 1, cat: 'drive',
    name: 'ION DRIVE MK-IX',
    ship: ['X-Wing', 'A-Wing', 'TIE/LN'],
    price: 4200,
    output: '180 kN', mass: '240 kg', rating: '94%',
    color: 0x00E5FF,
    desc: 'Military-grade ion propulsion unit. Dual-stage plasma compression with adaptive thrust vectoring.'
  },
  {
    id: 2, cat: 'weapon',
    name: 'QUAD LASER ARRAY',
    ship: ['Millennium Falcon', 'YT-2400'],
    price: 8900,
    output: '4×120 MW', mass: '380 kg', rating: '99%',
    color: 0xFF1744,
    desc: 'Quad-linked heavy laser cannons. Synchronized firing controller with auto-tracking targeting.'
  },
  {
    id: 3, cat: 'shield',
    name: 'DEFLECTOR SHIELD GX',
    ship: ['Star Destroyer', 'Mon Cal Cruiser'],
    price: 12400,
    output: '8.2 GJ/s', mass: '1200 kg', rating: '87%',
    color: 0x7C4DFF,
    desc: 'Bubble-type deflector shield system. Dual-layer ray and particle shielding with emergency flare mode.'
  },
  {
    id: 4, cat: 'drive',
    name: 'HYPERDRIVE CLASS-1',
    ship: ['X-Wing', 'Razor Crest', 'Slave I'],
    price: 31000,
    output: 'FTL ×1.0', mass: '890 kg', rating: 'Class 1',
    color: 0x1565FF,
    desc: 'Top-rated class one hyperdrive. Military spec with navigational backup unit and emergency drop-out.'
  },
  {
    id: 5, cat: 'sensor',
    name: 'LONG-RANGE SENSOR ARRAY',
    ship: ['Rebel Cruiser', 'CR90 Corvette'],
    price: 6700,
    output: '10 parsec', mass: '120 kg', rating: 'Grade A',
    color: 0x00B0FF,
    desc: 'High-resolution passive/active sensor suite. Deep-space scanning with IFF friend-or-foe detection.'
  },
  {
    id: 6, cat: 'hull',
    name: 'DURASTEEL PLATING TX-7',
    ship: ['Any Vessel'],
    price: 2100,
    output: 'Grade V', mass: '450 kg/panel', rating: '99.9%',
    color: 0x607D8B,
    desc: 'High-tensile durasteel ablative plating. Laser-cut reinforcement grid with thermal dissipation layer.'
  },
  {
    id: 7, cat: 'weapon',
    name: 'PROTON TORPEDO MK-3',
    ship: ['X-Wing', 'Y-Wing', 'B-Wing'],
    price: 1800,
    output: '180 MT', mass: '45 kg', rating: '96%',
    color: 0xFF9800,
    desc: 'Guided proton torpedo. Magnetic-lock warhead with proximity and impact detonation modes.'
  },
  {
    id: 8, cat: 'shield',
    name: 'RAY-SHIELD EMITTER RX',
    ship: ['Naboo Fighter', 'ARC-170'],
    price: 9300,
    output: '3.1 GJ/s', mass: '220 kg', rating: 'Class A',
    color: 0x7C4DFF,
    desc: 'Compact ray shield emitter. Frequency-shifting barrier with automatic threat adaptation protocols.'
  },
  {
    id: 9, cat: 'sensor',
    name: 'TARGETING COMPUTER V12',
    ship: ['X-Wing', 'TIE Interceptor', 'A-Wing'],
    price: 3400,
    output: '99.7% acc', mass: '35 kg', rating: 'Mil-Spec',
    color: 0x00E5FF,
    desc: 'Advanced fire control computer. Predictive intercept algorithms with multi-target tracking.'
  },
  {
    id: 10, cat: 'drive',
    name: 'SUBLIGHT ENGINE T-7',
    ship: ['Y-Wing', 'B-Wing', 'ARC-170'],
    price: 7800,
    output: '220 kN', mass: '310 kg', rating: '91%',
    color: 0xFF6D00,
    desc: 'Twin ion sublight engines. High-output plasma injectors with thrust-to-weight optimized nacelles.'
  },
  {
    id: 11, cat: 'hull',
    name: 'NEUTRONIUM ARMOR SLAB',
    ship: ['Star Destroyer', 'Dreadnought'],
    price: 48000,
    output: 'Grade X', mass: '4200 kg', rating: '99.99%',
    color: 0x455A64,
    desc: 'Compressed neutronium composite armor. Near-impenetrable defense rated for turbolaser impacts.'
  },
  {
    id: 12, cat: 'weapon',
    name: 'TURBOLASER BATTERY MK-IV',
    ship: ['Imperial SD', 'Venator-class'],
    price: 95000,
    output: '48 GW', mass: '12000 kg', rating: '98%',
    color: 0xFF1744,
    desc: 'Heavy turbolaser battery. Rapid-cycling capacitor bank with automated loading mechanisms.'
  },
];

const SHIPS = [
  {
    id: 1,
    name: 'IMPERIAL STAR DESTROYER',
    cls: 'Imperial-class Star Destroyer',
    color: 0x8899aa,
    glb: 'models/star_destroyer.glb',
    available: true,
  },
  {
    id: 2,
    name: 'T-65 X-WING',
    cls: 'Incom Corporation Starfighter',
    color: 0xCC3333,
    glb: 'models/x_wing.glb',
    available: true,
  },
  {
    id: 3,
    name: 'DEATH STAR',
    cls: 'DS-1 Orbital Battle Station',
    color: 0x556677,
    glb: 'models/death_star.glb',
    available: true,
  },
  {
    id: 4,
    name: 'TIE INTERCEPTOR',
    cls: 'TIE/IN Interceptor',
    color: 0x444455,
    glb: 'models/tie_interceptor.glb',
    available: true,
  },
  {
    id: 5,
    name: 'Y-WING BTL-S3',
    cls: 'Koensayr Assault Bomber',
    color: 0xB8A990,
    glb: null,
    available: false,
  },
];

const NODES = [
  { id: 'hyperdrive', name: 'Hyperdrive Core', status: 'ok', cat: 'drive' },
  { id: 'shields', name: 'Deflector Shield', status: 'ok', cat: 'shield' },
  { id: 'weapons', name: 'Laser Cannons', status: 'warn', cat: 'weapon' },
  { id: 'engines_l', name: 'Ion Engine L', status: 'ok', cat: 'drive' },
  { id: 'engines_r', name: 'Ion Engine R', status: 'crit', cat: 'drive' },
  { id: 'sensors', name: 'Sensor Array', status: 'ok', cat: 'sensor' },
  { id: 'hull', name: 'Hull Plating', status: 'ok', cat: 'hull' },
  { id: 'nav', name: 'Navigation System', status: 'ok', cat: 'sensor' },
];

const ACHIEVEMENTS = [
  { icon: '🏆', name: 'First Purchase', desc: 'Bought your first component', unlocked: true },
  { icon: '⚡', name: 'Speed Merchant', desc: 'Ordered within 60 seconds', unlocked: true },
  { icon: '🔧', name: 'Mechanic Rank III', desc: 'Purchased 10 drive components', unlocked: true },
  { icon: '💎', name: 'Premium Buyer', desc: 'Spent 50,000+ credits', unlocked: true },
  { icon: '🚀', name: 'Fleet Commander', desc: 'Complete 20 orders', unlocked: false },
  { icon: '⭐', name: 'Sector Legend', desc: 'Complete 100 orders', unlocked: false },
  { icon: '🌌', name: 'Galactic Titan', desc: 'Spend 1,000,000 credits', unlocked: false },
  { icon: '🤝', name: 'Trusted Dealer', desc: 'Refer 5 pilots', unlocked: false },
];
