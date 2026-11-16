// EMBERFALL KEEP — config.js
// Every number the game tunes lives in this one file: the canvas, the
// lanes and build plots, the four towers, the five enemies, the ten waves
// and the six boons. Nothing else in the game hard-codes a balance value.
// Scenery is generated here too, from a fixed seed, so the field looks
// the same on every load and every screenshot.
export const VIEW_W = 1280;
export const VIEW_H = 720;

// The lighthouse guards the left edge; the shadow tide marches in from
// the right and leaks past the goal line at x = 150.
export const LIGHTHOUSE_X = 96;
export const LANES_Y = [252, 392, 532];
export const SPAWN_X = 1330;
export const GOAL_X = 150;

// Build plots: four rows of glowing circles tucked between the lanes.
export const PLOT_ROWS_Y = [168, 322, 462, 602];
export const PLOT_COLS_X = [300, 425, 550, 675, 800, 925, 1050, 1175];
export const PLOT_R = 26;

export const START_GOLD = 200;
export const START_LIVES = 20;
export const MAX_WAVE = 10;
export const KILL_GOLD_BONUS = 2; // extra gold per kill, above the bounty
export const WAVE_CLEAR_BONUS = 45;

// Tower types. cost, range (px), damage per shot, seconds between shots,
// plus the special effect each one carries.
export const TOWERS = {
  ember: {
    key: 'ember', name: 'Ember Spout', cost: 40, range: 160, damage: 18,
    rate: 0.4, color: '#ff9a3c', glow: '#ffb347', blurb: 'Fast flames. Burns for 3s.',
    burn: 6, burnTime: 3, projSpeed: 520, projColor: '#ffb347',
  },
  frost: {
    key: 'frost', name: 'Frost Lantern', cost: 50, range: 145, damage: 7,
    rate: 0.85, color: '#7fd4ff', glow: '#bfe9ff', blurb: 'Chills: slows enemies 45%.',
    slow: 0.55, slowTime: 1.8, projSpeed: 420, projColor: '#aee6ff',
  },
  spark: {
    key: 'spark', name: 'Spark Coil', cost: 70, range: 175, damage: 13,
    rate: 0.8, color: '#ffe45e', glow: '#fff3a0', blurb: 'Lightning chains to 3 foes.',
    chain: 3, projSpeed: 900, projColor: '#fff3a0',
  },
  thorn: {
    key: 'thorn', name: 'Thorn Bramble', cost: 90, range: 130, damage: 42,
    rate: 1.5, color: '#c98cff', glow: '#e3b8ff', blurb: 'Heavy splash. Hits a crowd.',
    splash: 70, projSpeed: 380, projColor: '#d9a0ff',
  },
};
export const TOWER_KEYS = ['ember', 'frost', 'spark', 'thorn'];
export const UPGRADE_COST = [60, 110, 180]; // level 1->2, 2->3, 3->4
export const UPGRADE_MULT = 1.55; // damage multiplier per tower level
export const SELL_FRACTION = 0.7;

// Enemy types. hp, speed (px/s), gold bounty, radius, how much light a
// leak costs.
export const ENEMIES = {
  wisp:  { key: 'wisp',  name: 'Wisp',          hp: 22,   speed: 68, bounty: 6,   radius: 13, color: '#8ef0ff', leak: 1 },
  husk:  { key: 'husk',  name: 'Husk',          hp: 100,  speed: 34, bounty: 12,  radius: 20, color: '#b8a7e6', leak: 1 },
  shade: { key: 'shade', name: 'Shade',         hp: 52,   speed: 52, bounty: 9,   radius: 15, color: '#7d6bd6', leak: 1 },
  moth:  { key: 'moth',  name: 'Moth Swarm',    hp: 15,   speed: 95, bounty: 4,   radius: 10, color: '#ffd27f', leak: 1 },
  dread: { key: 'dread', name: 'Dread Captain', hp: 2600, speed: 26, bounty: 300, radius: 34, color: '#ff5d7a', leak: 5 },
};

// The Dread Captain's telegraphed slam: every SLAM_INTERVAL seconds he
// raises his arms for SLAM_WINDUP seconds (a red ring grows under him),
// then slams the ground, stunning towers within SLAM_RADIUS for
// SLAM_STUN seconds. The ring and the windup are the warning — a player
// who watches the boss can sell or rebuild around it.
export const SLAM_INTERVAL = 8;
export const SLAM_WINDUP = 0.9;
export const SLAM_RADIUS = 110;
export const SLAM_STUN = 1.0;

// Wave composition: [enemyKey, count] groups. Wave 10 is the boss plus
// escorts. HP scales up each wave.
export const WAVES = [
  [['wisp', 8]],
  [['wisp', 10], ['shade', 3]],
  [['wisp', 10], ['shade', 6], ['husk', 2]],
  [['shade', 10], ['husk', 4], ['moth', 8]],
  [['wisp', 14], ['husk', 6], ['moth', 10]],
  [['shade', 12], ['husk', 8], ['moth', 12]],
  [['husk', 12], ['shade', 12], ['wisp', 12]],
  [['moth', 22], ['husk', 10], ['shade', 10]],
  [['husk', 14], ['shade', 16], ['wisp', 16], ['moth', 14]],
  [['dread', 1], ['shade', 10], ['husk', 8], ['moth', 12]],
];
export const WAVE_HP_MULT = [1, 1.1, 1.22, 1.38, 1.55, 1.75, 2.0, 2.3, 2.65, 3.1];
export const SPAWN_GAP = 0.85; // seconds between spawns inside a wave

// Boons offered between waves: pick one of three.
export const BOONS = [
  { key: 'gold',   name: 'Ember Cache',    desc: '+120 gold right now',         icon: '◈' },
  { key: 'repair', name: 'Mend the Light', desc: 'Restore 6 lighthouse light', icon: '✚' },
  { key: 'power',  name: 'Kindled Wicks',  desc: 'All towers +15% damage',     icon: '▲' },
  { key: 'range',  name: 'Far Sight',      desc: 'All towers +12% range',      icon: '◎' },
  { key: 'haste',  name: 'Quick Hands',    desc: 'All towers fire 12% faster', icon: '≫' },
  { key: 'bounty', name: 'Rich Veins',     desc: '+3 gold per kill',            icon: '◆' },
];

// Mid-field scenery: rocks, grass tufts, glow-shrooms and ember flowers
// scattered between the lanes and the plots. Generated once from a fixed
// seed, so the field is identical on every load. Kept clear of lanes and
// plots so nothing hides a tower or an enemy.
function makeScenery() {
  let seed = 1337;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const kinds = ['rock', 'tuft', 'shroom', 'flowers', 'rock', 'tuft'];
  const out = [];
  let guard = 0;
  while (out.length < 42 && guard++ < 600) {
    const x = 210 + rnd() * 1040;
    const y = 150 + rnd() * 540;
    if (LANES_Y.some((ly) => Math.abs(y - ly) < 52)) continue;
    if (PLOT_ROWS_Y.some((py) => Math.abs(y - py) < 46) && PLOT_COLS_X.some((px) => Math.abs(x - px) < 52)) continue;
    if (x < 220) continue; // keep the lighthouse cliff clear
    out.push({ x, y, kind: kinds[Math.floor(rnd() * kinds.length)], s: 0.7 + rnd() * 0.7, ph: rnd() * Math.PI * 2 });
  }
  return out;
}
export const SCENERY = makeScenery();
