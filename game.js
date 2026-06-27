// ===========================================================================
//  CITRYN FIGHT CLUB  -  client-only 2D arcade fighter (canvas, no build step)
// ===========================================================================
import { STR } from "./strings.js";

// ---------- virtual resolution ----------
const VW = 1280, VH = 720;
const DEFAULT_FLOOR = 632;    // feet line for stages without an override
const WALL_L = 110, WALL_R = VW - 110;

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

function resize() {
  const scale = Math.min(innerWidth / VW, innerHeight / VH);
  canvas.width = VW; canvas.height = VH;
  canvas.style.width = Math.round(VW * scale) + "px";
  canvas.style.height = Math.round(VH * scale) + "px";
  ctx.imageSmoothingEnabled = false;
}
addEventListener("resize", resize);
addEventListener("orientationchange", resize);
resize();

// canvas-space mapping for touch
function toVirtual(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left) / r.width * VW, y: (clientY - r.top) / r.height * VH };
}

// ---------- deterministic RNG (mulberry32) ----------
let _seed = 0x1a2b3c4d >>> 0;
function rng() {
  _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rand = (a, b) => a + (b - a) * rng();
const chance = p => rng() < p;
const emptyInput = () => ({ left:false, right:false, up:false, down:false, punch:false, kick:false, block:false, jump:false, special:false });

// ===========================================================================
//  ASSETS
// ===========================================================================
// Fighter art. ft = cells in the horizontal strip (1 = single static pose).
// Brandon now mixes an 8-frame run sheet with single-pose action art; Garet
// still uses single-pose references for every state.
const SHEETS = {
  b_idle:  { file: "Brandon/Brandon.png", ft: 1 },
  b_run:   { file: "Brandon/brandon run sprite.png", ft: 8 },
  b_jump:  { file: "Brandon/jump.png",    ft: 1 },
  b_punch: { file: "Brandon/punch.png",   ft: 1 },
  b_kick:  { file: "Brandon/kick.png",    ft: 1 },
  b_special:{ file: "Brandon/special.png", ft: 1 },
  b_block: { file: "Brandon/block.png",   ft: 1 },
  b_duck:  { file: "Brandon/duck.png",    ft: 1 },
  b_hurt:  { file: "Brandon/got_hit.png", ft: 1 },
  b_dead:  { file: "Brandon/lost.png",    ft: 1 },
  b_won:   { file: "Brandon/won.png",     ft: 1 },
  g_idle:  { file: "Garet/Garet-idle.png", ft: 1 },
  g_run:   { file: "Garet/garet run sprite.png", ft: 8 },
  g_jump:  { file: "Garet/jump.png",       ft: 1 },
  g_punch: { file: "Garet/punch.png",      ft: 1 },
  g_kick:  { file: "Garet/kick.png",       ft: 1 },
  g_special:{ file: "Garet/special.png",   ft: 1 },
  g_block: { file: "Garet/block.png",      ft: 1 },
  g_duck:  { file: "Garet/duck.png",       ft: 1 },
  g_hurt:  { file: "Garet/Hit.png",        ft: 1 },
  g_dead:  { file: "Garet/lost.png",       ft: 1 },
  g_won:   { file: "Garet/win.png",        ft: 1 },
  m_idle:  { file: "mo/mo-idle.png",       ft: 1 },
  m_run:   { file: "mo/mo run sprite.png", ft: 8 },
  m_jump:  { file: "mo/jump.png",          ft: 1 },
  m_punch: { file: "mo/punch.png",         ft: 1 },
  m_kick:  { file: "mo/kick.png",          ft: 1 },
  m_special:{ file: "Mo/special.png",      ft: 1 },
  m_block: { file: "mo/block.png",         ft: 1 },
  m_duck:  { file: "mo/duck.png",          ft: 1 },
  m_hurt:  { file: "mo/hit.png",           ft: 1 },
  m_dead:  { file: "mo/lost.png",          ft: 1 },
  m_won:   { file: "mo/won.png",           ft: 1 },
  s_idle:  { file: "steven/idle.png",      ft: 1 },
  s_run:   { file: "steven/steven run sprite.png", ft: 8 },
  s_jump:  { file: "steven/jump.png",      ft: 1 },
  s_punch: { file: "steven/punch.png",     ft: 1 },
  s_kick:  { file: "steven/kick.png",      ft: 1 },
  s_special:{ file: "Steven/special.png",  ft: 1 },
  s_block: { file: "steven/block.png",     ft: 1 },
  s_duck:  { file: "steven/duck.png",      ft: 1 },
  s_hurt:  { file: "steven/hit.png",       ft: 1 },
  s_dead:  { file: "steven/lost.png",      ft: 1 },
  s_won:   { file: "steven/won.png",       ft: 1 },
  t_idle:  { file: "tom/idle.png",         ft: 1 },
  t_run:   { file: "tom/tom run sprite.png", ft: 8 },
  t_jump:  { file: "tom/jump.png",         ft: 1 },
  t_punch: { file: "tom/punch.png",        ft: 1 },
  t_kick:  { file: "tom/kick.png",         ft: 1 },
  t_special:{ file: "Tom/special.png",     ft: 1 },
  t_block: { file: "tom/block.png",        ft: 1 },
  t_duck:  { file: "tom/duck.png",         ft: 1 },
  t_hurt:  { file: "tom/hit.png",          ft: 1 },
  t_dead:  { file: "tom/lost.png",         ft: 1 },
  t_won:   { file: "tom/win.png",          ft: 1 },
};
const BG_FILES = {
  mainmenu: "mainmenu.png",
  map1: "mapog.png",
  boiler: "stage_boiler.jpg",
  desks: "at-the-desks.png",
  garage: "the-garage.png",
  truxton: "Truxton/Street-base.webp",
  truxtonCars: "Truxton/Cars-sprite.webp",
};

const CUTSCENE_FILES = {
  brandon: "Brandon/brandon-special-cut-scene.mp4",
  garet: "Garet/garets special-cut-scene.mp4",
  mo: "Mo/mo-special-cut-scene.mp4",
  steven: "Steven/stevens-special-cut-scene.mp4",
  tom: "Tom/tom-special-cut-scene.mp4",
};

// audio file names (per-file extension: music m4a, sfx mp3, voice wav)
const AUDIO_FILES = {
  music:"music_fight.m4a", punch:"sfx_punch.mp3", kick:"sfx_kick.mp3", block:"sfx_block.mp3",
  whiff:"sfx_whiff.mp3", special:"sfx_special.mp3",
  round1:"vo_round1.wav", round2:"vo_round2.wav", round3:"vo_round3.wav",
  fight:"vo_fight.wav", ko:"vo_ko.wav", win:"vo_win.wav"
};

const ASSET = {};    // key -> {img, ft, cellW, srcLeft, srcTop, srcW, srcH}
const BG = {};       // key -> Image
const CUTSCENE = {}; // key -> HTMLVideoElement
const SOUNDS = {};   // name -> HTMLAudioElement (template)
const IMG_CACHE_BUST = "2026-06-25-local-refresh-2";
let musicEl = null;
const _tc = document.createElement("canvas");   // scratch canvas for tinting
const _tx = _tc.getContext("2d");

// Find the character's content box inside a sheet/pose: for sheets (ft>1) we
// trim only top/bottom (so every cell shares one baseline = planted feet) and
// keep the full cell width; for single poses (ft==1) we trim all four sides.
function analyzeSheet(img, ft) {
  const cellW = img.width / ft;
  let top = 0, h = img.height, left = 0, w = cellW;
  try {
    const oc = document.createElement("canvas"); oc.width = img.width; oc.height = img.height;
    const o = oc.getContext("2d"); o.drawImage(img, 0, 0);
    const d = o.getImageData(0, 0, img.width, img.height).data;
    let minY = img.height, maxY = -1, minX = img.width, maxX = -1;
    for (let y = 0; y < img.height; y++) {
      const row = y * img.width;
      for (let x = 0; x < img.width; x++) {
        if (d[(row + x) * 4 + 3] > 24) {
          if (y < minY) minY = y; if (y > maxY) maxY = y;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
        }
      }
    }
    if (maxY >= 0) {
      top = minY; h = maxY - minY + 1;
      if (ft === 1) { left = minX; w = maxX - minX + 1; }
    }
  } catch (e) {}
  return { img, ft, cellW, srcLeft: left, srcTop: top, srcW: w, srcH: h };
}

function loadSheet(key, file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { ASSET[key] = analyzeSheet(img, SHEETS[key].ft); res(true); };
    img.onerror = () => { console.error("sheet load failed:", file); res(false); };
    img.src = `./assets/${file}?v=${IMG_CACHE_BUST}`;
  });
}
function loadBG(key, file) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { BG[key] = img; res(true); };
    img.onerror = () => res(false);
    img.src = `./assets/${file}?v=${IMG_CACHE_BUST}`;
  });
}

function loadCutscene(key, file) {
  const v = document.createElement("video");
  v.preload = "metadata";
  v.playsInline = true;
  v.disablePictureInPicture = true;
  v.onerror = () => console.warn("cutscene load failed:", file);
  v.src = `./assets/${file}?v=${IMG_CACHE_BUST}`;
  v.load();
  CUTSCENE[key] = v;
  return v;
}

function ensureCutscene(key) {
  if (!CUTSCENE[key] && CUTSCENE_FILES[key]) loadCutscene(key, CUTSCENE_FILES[key]);
  return CUTSCENE[key];
}

function warmCutscene(key) {
  const v = ensureCutscene(key);
  if (!v) return;
  v.preload = "auto";
  try { v.load(); } catch (e) {}
}

function startCutscenePlayback(key) {
  const v = ensureCutscene(key);
  if (!v) return false;
  try {
    v.pause();
    v.currentTime = 0;
    v.muted = muted;
    v.volume = VOL.sfx;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
    return true;
  } catch (e) {
    return false;
  }
}

function stopCutscenePlayback(key) {
  const v = CUTSCENE[key];
  if (!v) return;
  try { v.pause(); } catch (e) {}
}

function cutsceneDurationFrames(key) {
  const v = ensureCutscene(key);
  if (!v || !Number.isFinite(v.duration) || v.duration <= 0) return CINEMATIC_SPECIAL_FALLBACK_VIDEO_FRAMES;
  return Math.max(1, Math.ceil(v.duration * 60));
}

function cutsceneReadyForPlayback(key) {
  const v = ensureCutscene(key);
  return !!(v && v.readyState >= 2 && v.videoWidth && v.videoHeight && Number.isFinite(v.duration) && v.duration > 0);
}

// Draw cell `frameIdx` of `key` scaled so its content height == H, anchored
// bottom-center at (x, y). flip mirrors horizontally around x. opts.tint draws
// a solid-color silhouette (trails / hit flash); opts.alpha sets opacity.
function drawCell(key, frameIdx, x, y, H, flip, opts) {
  const a = ASSET[key]; if (!a) return;
  const scale = H / a.srcH;
  const dw = a.srcW * scale, dh = H;
  const sx = frameIdx * a.cellW + a.srcLeft, sy = a.srcTop, sw = a.srcW, sh = a.srcH;
  const dx = x - dw / 2, dy = y - dh;
  ctx.save();
  if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.globalAlpha = (opts && opts.alpha != null) ? opts.alpha : 1;
  if (opts && opts.tint) {
    _tc.width = sw; _tc.height = sh;
    _tx.globalCompositeOperation = "source-over";
    _tx.clearRect(0, 0, sw, sh);
    _tx.drawImage(a.img, sx, sy, sw, sh, 0, 0, sw, sh);
    _tx.globalCompositeOperation = "source-in";
    _tx.fillStyle = opts.tint; _tx.fillRect(0, 0, sw, sh);
    ctx.drawImage(_tc, 0, 0, sw, sh, dx, dy, dw, dh);
  } else {
    ctx.drawImage(a.img, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function loadSound(name, file) {
  return new Promise(res => {
    const a = new Audio();
    a.preload = "auto";
    a.oncanplaythrough = () => res(true);
    a.onerror = () => res(false);
    a.src = `./assets/${file}`;
    SOUNDS[name] = a;
    // some browsers won't fire canplaythrough until interaction; resolve soon anyway
    setTimeout(() => res(true), 1500);
  });
}

const VOL = { music: 0.30, sfx: 0.65, vo: 0.9 };
let audioReady = false, muted = false;
function unlockAudio() {
  if (audioReady) return;
  audioReady = true;
  if (SOUNDS.music) {
    musicEl = SOUNDS.music;
    musicEl.loop = true; musicEl.volume = VOL.music;
    musicEl.play().catch(() => {});
  }
}
function sfx(name, vol = VOL.sfx) {
  if (muted || !SOUNDS[name]) return;
  try { const n = SOUNDS[name].cloneNode(); n.volume = vol; n.play().catch(() => {}); } catch (e) {}
}
function vo(name) {
  if (muted || !SOUNDS[name]) return;
  try { const n = SOUNDS[name].cloneNode(); n.volume = VOL.vo; n.play().catch(() => {}); } catch (e) {}
}

// ===========================================================================
//  INPUT  (keyboard + touch + gamepad -> action tokens "p:act")
// ===========================================================================
const ACTS = ["left","right","up","down","punch","kick","block","special"];
const P_BIND = [
  { left:"KeyA", right:"KeyD", up:"KeyW", down:"KeyS", punch:"KeyF", kick:"KeyG", block:"KeyR", special:"KeyV" },
  { left:"ArrowLeft", right:"ArrowRight", up:"ArrowUp", down:"ArrowDown", punch:"KeyK", kick:"KeyL", block:"Semicolon", special:"Quote" },
];
const CODE2TOK = {};
P_BIND.forEach((m, p) => { for (const a of ACTS) CODE2TOK[m[a]] = p + ":" + a; });

const heldKT = new Set();      // keyboard + touch held tokens
let edgeBuf = [];              // tokens pressed this frame window (keyboard/touch)
let confirmEdge = false, backEdge = false, anyKeyEdge = false;

const GAME_CODES = new Set(Object.keys(CODE2TOK).concat(["Enter","Escape","Space"]));
addEventListener("keydown", e => {
  if (GAME_CODES.has(e.code)) e.preventDefault();
  if (!e.repeat) anyKeyEdge = true;   // ignore OS key-repeat so a held key can't cascade menus
  if (e.code === "Enter" || e.code === "Space") { if (!e.repeat) confirmEdge = true; return; }
  if (e.code === "Escape") { if (!e.repeat) backEdge = true; return; }
  const tok = CODE2TOK[e.code];
  if (!tok) return;
  heldKT.add(tok);
  if (!e.repeat) edgeBuf.push(tok);
});
addEventListener("keyup", e => { const tok = CODE2TOK[e.code]; if (tok) heldKT.delete(tok); });
addEventListener("blur", () => heldKT.clear());

// gamepad
let padPrev = [new Set(), new Set()];
function pollPads() {
  const cur = [new Set(), new Set()];
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < 2; i++) {
    const gp = pads[i]; if (!gp) continue;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const b = gp.buttons;
    const on = j => b[j] && b[j].pressed;
    if (ax < -0.4 || on(14)) cur[i].add(i + ":left");
    if (ax > 0.4 || on(15)) cur[i].add(i + ":right");
    if (ay < -0.5 || on(12)) cur[i].add(i + ":up");
    if (ay > 0.5 || on(13)) cur[i].add(i + ":down");
    if (on(0)) cur[i].add(i + ":punch");
    if (on(2)) cur[i].add(i + ":kick");
    if (on(1)) cur[i].add(i + ":up");          // B = jump alt
    if (on(5) || on(7)) cur[i].add(i + ":block");
    if (on(3)) cur[i].add(i + ":special");
    if (on(9)) backEdge = true;                // start = pause
  }
  return cur;
}

// touch on-screen controls (rebuilt per scene); store rects with token
let touchButtons = [];   // {x,y,w,h,tok,label,hold}
const touchActive = new Map();   // touchId -> token
let isTouch = (typeof window !== "undefined") && ("ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0);
function clearTouch() { touchButtons = []; }
function addBtn(x, y, w, h, tok, label) { touchButtons.push({ x, y, w, h, tok, label }); }

function handleTouchStart(id, vx, vy) {
  isTouch = true;
  for (const b of touchButtons) {
    if (vx >= b.x && vx <= b.x + b.w && vy >= b.y && vy <= b.y + b.h) {
      touchActive.set(id, b.tok);
      if (b.tok === "confirm") confirmEdge = true;
      else if (b.tok === "back") backEdge = true;
      else { heldKT.add(b.tok); edgeBuf.push(b.tok); }
      anyKeyEdge = true;
      return;
    }
  }
  // on the title screen only, a tap anywhere starts the game
  if (match.scene === "title") { confirmEdge = true; anyKeyEdge = true; }
}
function handleTouchEnd(id) {
  const tok = touchActive.get(id);
  if (tok && tok !== "confirm" && tok !== "back") heldKT.delete(tok);
  touchActive.delete(id);
}
addEventListener("touchstart", e => {
  for (const t of e.changedTouches) { const v = toVirtual(t.clientX, t.clientY); handleTouchStart(t.identifier, v.x, v.y); }
  e.preventDefault();
}, { passive: false });
addEventListener("touchend", e => { for (const t of e.changedTouches) handleTouchEnd(t.identifier); e.preventDefault(); }, { passive: false });
addEventListener("touchcancel", e => { for (const t of e.changedTouches) handleTouchEnd(t.identifier); e.preventDefault(); }, { passive: false });
addEventListener("mousedown", () => { if (match.scene === "title") { confirmEdge = true; anyKeyEdge = true; } });

// per-frame snapshot
let frameHeld = new Set(), frameEdge = new Set();
function beginFrameInput() {
  const padCur = pollPads();
  frameHeld = new Set(heldKT);
  for (let i = 0; i < 2; i++) for (const t of padCur[i]) frameHeld.add(t);
  frameEdge = new Set(edgeBuf);
  for (let i = 0; i < 2; i++) for (const t of padCur[i]) if (!padPrev[i].has(t)) frameEdge.add(t);
  // pad face buttons -> confirm in menus
  for (let i = 0; i < 2; i++) { if (frameEdge.has(i + ":punch")) { /* used as confirm in menu code */ } }
  padPrev = padCur;
}
function endFrameInput() { edgeBuf = []; confirmEdge = false; backEdge = false; anyKeyEdge = false; }
const held = (p, a) => frameHeld.has(p + ":" + a);
const pressed = (p, a) => frameEdge.has(p + ":" + a);

// ===========================================================================
//  CHARACTER DATA
// ===========================================================================
const CHARS = {
  brandon: {
    key: "brandon", name: STR.brandonName, tag: STR.brandonTag,
    drawH: 300, nativeFacing: 1, scaleMode: "fixed",
    walk: 6.5, back: 5.1, air: 5.9, jumpV: 15.6, grav: 0.82, kbTaken: 0.86,
    theme: { main: "#ff7a33", glow: "#ffce4a", dark: "#7a1f12" },
    specialName: STR.haymaker, specialKind: "haymaker",
    cinematic: { cutscene: "brandon", postAnim: "special", hurtTint: "#ffce4a" },
    punch: { startup: 5, active: 4, recovery: 11, dmg: 6, range: 108, reach: 34, kb: 3.0, hitstun: 14, type: "punch" },
    kick:  { startup: 9, active: 5, recovery: 17, dmg: 12, range: 152, reach: 48, kb: 5.4, hitstun: 19, type: "kick" },
    anim: {
      idle:   { key: "b_idle",  frames: 1, hold: 12, loop: true },
      walk:   { key: "b_run",   frames: 8, hold: 5,  loop: true },
      jump:   { key: "b_jump",  frames: 1, hold: 20, loop: false },
      crouch: { key: "b_duck",  frames: 1, hold: 10, loop: false },
      block:  { key: "b_block", frames: 1, hold: 10, loop: false },
      punch:  { key: "b_punch", frames: 1, hold: 8,  loop: false },
      kick:   { key: "b_kick",  frames: 1, hold: 8,  loop: false },
      special:{ key: "b_special", frames: 1, hold: 8, loop: false },
      hit:    { key: "b_hurt",  frames: 1, hold: 9,  loop: false },
      ko:     { key: "b_dead",  frames: 1, hold: 9,  loop: false },
      win:    { key: "b_won",   frames: 1, hold: 10, loop: false },
    },
  },
  garet: {
    key: "garet", name: STR.garetName, tag: STR.garetTag,
    drawH: 300, nativeFacing: 1, scaleMode: "fixed",
    walk: 7.8, back: 6.2, air: 7.0, jumpV: 16.9, grav: 0.80, kbTaken: 1.10,
    theme: { main: "#00e5ff", glow: "#9bffec", dark: "#0b3b6b" },
    specialName: STR.cyclone, specialKind: "cyclone",
    cinematic: { cutscene: "garet", postAnim: "special", hurtTint: "#9bffec" },
    punch: { startup: 4, active: 3, recovery: 9, dmg: 5, range: 102, reach: 32, kb: 2.6, hitstun: 12, type: "punch" },
    kick:  { startup: 8, active: 6, recovery: 15, dmg: 9, range: 162, reach: 52, kb: 4.6, hitstun: 16, type: "kick" },
    anim: {
      idle:   { key: "g_idle",  frames: 1, hold: 12, loop: true },
      walk:   { key: "g_run",   frames: 8, hold: 5,  loop: true },
      jump:   { key: "g_jump",  frames: 1, hold: 20, loop: false },
      crouch: { key: "g_duck",  frames: 1, hold: 10, loop: false },
      block:  { key: "g_block", frames: 1, hold: 10, loop: false },
      punch:  { key: "g_punch", frames: 1, hold: 8,  loop: false },
      kick:   { key: "g_kick",  frames: 1, hold: 8,  loop: false },
      special:{ key: "g_special", frames: 1, hold: 8, loop: false },
      hit:    { key: "g_hurt",  frames: 1, hold: 9,  loop: false },
      ko:     { key: "g_dead",  frames: 1, hold: 9,  loop: false, scale: 0.94 },
      win:    { key: "g_won",   frames: 1, hold: 10, loop: false },
    },
  },
  mo: {
    key: "mo", name: STR.moName, tag: STR.moTag,
    drawH: 300, nativeFacing: 1, scaleMode: "fixed",
    walk: 7.2, back: 5.7, air: 6.5, jumpV: 16.2, grav: 0.81, kbTaken: 0.98,
    theme: { main: "#ffd24a", glow: "#ff6a3d", dark: "#6b2b0b" },
    specialName: STR.moSpecial, specialKind: "haymaker",
    cinematic: { cutscene: "mo", postAnim: "special", hurtTint: "#ff6a3d" },
    punch: { startup: 5, active: 4, recovery: 10, dmg: 6, range: 106, reach: 34, kb: 2.9, hitstun: 13, type: "punch" },
    kick:  { startup: 8, active: 5, recovery: 16, dmg: 10, range: 158, reach: 50, kb: 5.0, hitstun: 17, type: "kick" },
    anim: {
      idle:   { key: "m_idle",  frames: 1, hold: 12, loop: true },
      walk:   { key: "m_run",   frames: 8, hold: 5,  loop: true },
      jump:   { key: "m_jump",  frames: 1, hold: 20, loop: false },
      crouch: { key: "m_duck",  frames: 1, hold: 10, loop: false },
      block:  { key: "m_block", frames: 1, hold: 10, loop: false },
      punch:  { key: "m_punch", frames: 1, hold: 8,  loop: false },
      kick:   { key: "m_kick",  frames: 1, hold: 8,  loop: false },
      special:{ key: "m_special", frames: 1, hold: 8, loop: false },
      hit:    { key: "m_hurt",  frames: 1, hold: 9,  loop: false },
      ko:     { key: "m_dead",  frames: 1, hold: 9,  loop: false },
      win:    { key: "m_won",   frames: 1, hold: 10, loop: false },
    },
  },
  steven: {
    key: "steven", name: STR.stevenName, tag: STR.stevenTag,
    drawH: 300, nativeFacing: 1, scaleMode: "fixed",
    walk: 6.9, back: 5.4, air: 6.2, jumpV: 15.9, grav: 0.82, kbTaken: 0.92,
    theme: { main: "#f0f4ff", glow: "#ff9a3d", dark: "#3b2a18" },
    specialName: STR.stevenSpecial, specialKind: "haymaker",
    cinematic: { cutscene: "steven", postAnim: "special", hurtTint: "#ff9a3d" },
    punch: { startup: 5, active: 4, recovery: 10, dmg: 6, range: 110, reach: 36, kb: 3.0, hitstun: 13, type: "punch" },
    kick:  { startup: 9, active: 5, recovery: 16, dmg: 11, range: 160, reach: 52, kb: 5.2, hitstun: 18, type: "kick" },
    anim: {
      idle:   { key: "s_idle",  frames: 1, hold: 12, loop: true },
      walk:   { key: "s_run",   frames: 8, hold: 5,  loop: true },
      jump:   { key: "s_jump",  frames: 1, hold: 20, loop: false, scale: 1.26 },
      crouch: { key: "s_duck",  frames: 1, hold: 10, loop: false },
      block:  { key: "s_block", frames: 1, hold: 10, loop: false },
      punch:  { key: "s_punch", frames: 1, hold: 8,  loop: false },
      kick:   { key: "s_kick",  frames: 1, hold: 8,  loop: false },
      special:{ key: "s_special", frames: 1, hold: 8, loop: false },
      hit:    { key: "s_hurt",  frames: 1, hold: 9,  loop: false },
      ko:     { key: "s_dead",  frames: 1, hold: 9,  loop: false },
      win:    { key: "s_won",   frames: 1, hold: 10, loop: false, scale: 1.12 },
    },
  },
  tom: {
    key: "tom", name: STR.tomName, tag: STR.tomTag,
    drawH: 300, nativeFacing: 1, scaleMode: "fixed",
    walk: 7.1, back: 5.6, air: 6.4, jumpV: 16.0, grav: 0.82, kbTaken: 0.96,
    theme: { main: "#7cff9b", glow: "#e8ff5a", dark: "#1f5c2e" },
    specialName: STR.tomSpecial, specialKind: "cyclone",
    cinematic: { cutscene: "tom", postAnim: "special", hurtTint: "#e8ff5a" },
    punch: { startup: 5, active: 4, recovery: 10, dmg: 6, range: 108, reach: 35, kb: 2.9, hitstun: 13, type: "punch" },
    kick:  { startup: 8, active: 5, recovery: 16, dmg: 10, range: 160, reach: 52, kb: 5.0, hitstun: 17, type: "kick" },
    anim: {
      idle:   { key: "t_idle",  frames: 1, hold: 12, loop: true },
      walk:   { key: "t_run",   frames: 8, hold: 5,  loop: true },
      jump:   { key: "t_jump",  frames: 1, hold: 20, loop: false },
      crouch: { key: "t_duck",  frames: 1, hold: 10, loop: false },
      block:  { key: "t_block", frames: 1, hold: 10, loop: false },
      punch:  { key: "t_punch", frames: 1, hold: 8,  loop: false },
      kick:   { key: "t_kick",  frames: 1, hold: 8,  loop: false },
      special:{ key: "t_special", frames: 1, hold: 8, loop: false },
      hit:    { key: "t_hurt",  frames: 1, hold: 9,  loop: false },
      ko:     { key: "t_dead",  frames: 1, hold: 9,  loop: false },
      win:    { key: "t_won",   frames: 1, hold: 10, loop: false },
    },
  },
};
const CHAR_LIST = ["brandon", "garet", "mo", "steven", "tom"];
const STAGES = [
  { bg: "map1", name: STR.stageLot, floor: 608 },
  { bg: "boiler", name: STR.stageBoiler },
  { bg: "desks", name: STR.stageDesks, floor: 616 },
  { bg: "garage", name: STR.stageGarage, floor: 616 },
  { bg: "truxton", name: STR.stageTruxton, floor: 648, overlay: { bg: "truxtonCars", frames: 10, hold: 18 } },
];

function stageFloor() {
  const st = STAGES[match.stage];
  return st && st.floor ? st.floor : DEFAULT_FLOOR;
}

function stageSelectCols() {
  return STAGES.length > 4 ? 3 : (STAGES.length > 2 ? 2 : STAGES.length);
}

// ===========================================================================
//  FIGHTER
// ===========================================================================
const MAXHP = 100, MAXMETER = 100;
const CINEMATIC_SPECIAL_DAMAGE = Math.round(MAXHP * 0.75);
const CINEMATIC_SPECIAL_PHASES = ["freeze", "overlay", "cinematic", "attacker_anim", "defender_hurt", "recover"];
const CINEMATIC_SPECIAL_DUR = {
  freeze: 24,
  overlay: 42,
  cinematic: 120,
  attacker_anim: 54,
  defender_hurt: 70,
  recover: 28,
};
const CINEMATIC_SPECIAL_FALLBACK_VIDEO_FRAMES = CINEMATIC_SPECIAL_DUR.cinematic;
const CINEMATIC_SPECIAL_MAX_OVERLAY_WAIT = 180;
const CINEMATIC_SPECIAL_DAMAGE_FRAME = 18;
function makeFighter(charKey, side, isCPU) {
  const cd = CHARS[charKey];
  return {
    cd, side, isCPU,
    x: side === 0 ? VW * 0.34 : VW * 0.66, y: stageFloor(), vx: 0, vy: 0,
    facing: side === 0 ? 1 : -1, onGround: true,
    state: "idle", st: 0,                    // state + state timer (frames)
    atk: null, atkF: 0, atkHit: false,       // current normal attack
    sp: null, spF: 0, spHits: 0,             // special timeline
    stun: 0, invuln: 0,
    hp: MAXHP, meter: 0, roundWins: 0,
    heldBlock: false, blockFx: 0,
    walkPhase: 0, lunge: 0,
    flash: 0, flashColor: "#fff", recoil: 0,
    trail: [], superFlash: 0,
    ai: { t: 0, cool: 0, blockT: 0, want: null },
    animName: "idle", animFrame: 0, animElapsed: 0, spAnim: "special",
  };
}
function resetForRound(f, side) {
  f.x = side === 0 ? VW * 0.34 : VW * 0.66; f.y = stageFloor(); f.vx = 0; f.vy = 0;
  f.facing = side === 0 ? 1 : -1; f.onGround = true;
  f.state = "idle"; f.st = 0; f.atk = null; f.sp = null; f.stun = 0; f.invuln = 0;
  f.hp = MAXHP; f.recoil = 0; f.flash = 0; f.trail = [];
  f.animName = "idle"; f.animFrame = 0; f.animElapsed = 0;
  f.spAnim = "special";
  if (match.mode === "training") f.meter = MAXMETER;
  else f.meter = Math.min(f.meter, MAXMETER);
}

const actionable = f => (f.state === "idle" || f.state === "walk" || f.state === "crouch" || f.state === "block") && f.stun <= 0;

function startAttack(f, type) {
  const a = f.cd[type];
  f.state = "attack"; f.atk = a; f.atkF = 0; f.atkHit = false; f.lunge = 0;
  sfx("whiff", 0.4);
}

function canStartCinematicSpecial(f) {
  return !match.specialSeq &&
    f.meter >= MAXMETER &&
    f.onGround &&
    f.stun <= 0 &&
    (f.state === "idle" || f.state === "walk" || f.state === "crouch");
}
function startCinematicSpecial(f, opp) {
  const attackerSide = f.side;
  const defenderSide = opp.side;
  const cutscene = f.cd.cinematic.cutscene;
  match.specialSeq = {
    attackerSide,
    defenderSide,
    phase: "freeze",
    phaseT: 0,
    totalT: 0,
    cutscene,
    videoFrames: cutsceneDurationFrames(cutscene),
    damageApplied: false,
    ko: false,
  };
  if (match.mode !== "training") f.meter = 0;
  lockFighterForCinematic(f, "special_cinematic");
  lockFighterForCinematic(opp, "special_hurt");
  f.spAnim = f.cd.cinematic.postAnim || "special";
  opp.flash = 10; opp.flashColor = f.cd.cinematic.hurtTint || f.cd.theme.glow;
  fx.slowmo = 0; fx.hitstop = 0; fx.flashScreen = 12; fx.flashCol = f.cd.theme.main;
  shake(7);
  sfx("special", 0.8);
}
function lockFighterForCinematic(f, state) {
  f.state = state; f.st = 0; f.atk = null; f.atkF = 0; f.atkHit = false;
  f.sp = null; f.spF = 0; f.spHits = 0; f.stun = 0; f.invuln = 0;
  f.vx = 0; f.vy = 0; f.lunge = 0; f.recoil = 0; f.heldBlock = false;
  f.onGround = true; f.y = stageFloor();
}

function fighterControl(f, opp, IN) {
  if (f.state === "ko") return;
  // auto-face when grounded & free
  if (f.onGround && actionable(f)) f.facing = (opp.x >= f.x) ? 1 : -1;
  let mv = 0;
  if (IN.left) mv -= 1;
  if (IN.right) mv += 1;

  if (f.stun > 0) { f.stun--; }
  if (f.invuln > 0) f.invuln--;
  f.heldBlock = false;

  // ---- normal attack frames ----
  if (f.state === "attack") {
    const a = f.atk; f.atkF++;
    const active = f.atkF > a.startup && f.atkF <= a.startup + a.active;
    if (f.atkF <= a.startup + a.active) f.lunge = Math.sin(Math.min(1, f.atkF / (a.startup + a.active)) * Math.PI) * 16;
    if (active && !f.atkHit) tryHit(f, opp, a);
    if (f.atkF >= a.startup + a.active + a.recovery) { f.state = "idle"; f.atk = null; f.lunge = 0; }
    // light gravity if airborne edge case
    applyGravity(f);
    return;
  }

  // ---- hitstun / knockdown ----
  if (f.state === "hit") {
    applyGravity(f);
    f.recoil = Math.max(0, f.recoil - 1);
    if (f.stun <= 0 && f.onGround) { f.state = "idle"; }
    return;
  }
  if (f.state === "knockdown") {
    f.st++;
    applyGravity(f);
    // fall, lie, get up
    if (f.st < 26) f.downAngle = Math.min(1, f.st / 12) * f.facing * -1.45;
    else if (f.st < 52) f.downAngle = f.facing * -1.45;
    else { f.downAngle *= 0.8; if (f.st >= 64) { f.state = "idle"; f.downAngle = 0; f.invuln = 16; } }
    return;
  }
  if (f.state === "win") { f.vx = 0; return; }

  // ---- free actions ----
  // crouch
  const wantCrouch = IN.down;
  const wantBlock = IN.block && !IN.down;
  if (!f.onGround) {
    if (mv !== 0) {
      f.vx = mv * f.cd.air;
      f.facing = mv > 0 ? 1 : -1;
    }
    applyGravity(f);
    // can't act in air (simple model)
  } else {
    if (IN.special && !wantBlock && canStartCinematicSpecial(f)) { startCinematicSpecial(f, opp); return; }
    if (IN.punch) { startAttack(f, "punch"); return; }
    if (IN.kick) { startAttack(f, "kick"); return; }
    if (IN.jump) {
      f.vx = mv * f.cd.air;
      if (mv !== 0) f.facing = mv > 0 ? 1 : -1;
      f.vy = -f.cd.jumpV; f.onGround = false; f.state = "jump"; f.st = 0; applyGravity(f); spawnDust(f.x, f.y, 5); return;
    }

    if (wantBlock) { f.state = "block"; f.heldBlock = true; f.vx = 0; }
    else if (wantCrouch) { f.state = "crouch"; f.vx = 0; }
    else {
      // walking
      if (mv !== 0) {
        const towardOpp = Math.sign(opp.x - f.x) || 1;
        const spd = (mv === towardOpp) ? f.cd.walk : f.cd.back;
        f.vx = mv * spd; f.state = "walk"; f.walkPhase += 0.3;
        f.facing = mv > 0 ? 1 : -1;   // face the running direction so the sprite mirrors
      } else { f.vx = 0; f.state = "idle"; }
      f.x += f.vx;
    }
  }
  f.x = clamp(f.x, WALL_L, WALL_R);
}

function applyGravity(f) {
  if (!f.onGround) {
    f.vy += f.cd.grav; f.y += f.vy; f.x += f.vx;
    f.x = clamp(f.x, WALL_L, WALL_R);
    const floor = stageFloor();
    if (f.y >= floor) { f.y = floor; f.vy = 0; f.onGround = true; if (f.state === "jump") f.state = "idle"; spawnDust(f.x, f.y, 6); }
  }
}

function tryHit(att, def, a, isSpecial) {
  // hit zone in front of attacker
  const front = att.x + att.facing * (a.range * 0.5 + a.reach);
  const dx = Math.abs(front - def.x);
  const facingRight = (def.x - att.x) * att.facing > 0; // def is in front
  if (!facingRight) return;
  const reachOK = Math.abs(def.x - att.x) < (a.range + 56);
  const heightOK = def.onGround;     // simple: ground combat
  if (!(reachOK && heightOK)) return;
  if (def.invuln > 0) { if (!isSpecial) att.atkHit = true; return; }

  if (!isSpecial) att.atkHit = true;

  // block check
  const blocking = def.heldBlock && def.onGround && ((att.x - def.x) * def.facing > 0);
  if (blocking) {
    const chip = Math.max(1, Math.round(a.dmg * 0.18));
    def.hp = Math.max(0, def.hp - chip);
    def.stun = Math.max(def.stun, 8);
    def.state = "block"; def.blockFx = 8;
    def.x += att.facing * 5; def.x = clamp(def.x, WALL_L, WALL_R);
    spawnSpark((att.x + def.x) / 2, def.y - 150, "#9bffec", 7);
    sfx("block", 0.6);
    fx.hitstop = Math.max(fx.hitstop, 4);
    if (def.hp <= 0) doKO(att, def);
    return;
  }

  // clean hit
  const dmg = a.dmg;
  def.hp = Math.max(0, def.hp - dmg);
  if (!isSpecial) gainMeter(att, 12);
  def.flash = 6; def.flashColor = "#ffffff"; def.recoil = 8;
  const kb = (a.kb || 3) * def.cd.kbTaken;
  def.vx = att.facing * kb;
  const hy = def.y - 150 - rand(-20, 20);
  spawnSpark((def.x + att.facing * 30), hy, att.cd.theme.glow, isSpecial ? 10 : 8);
  spawnSpark((def.x + att.facing * 30), hy, "#ffffff", 4);
  shake(isSpecial ? 6 : (a.type === "kick" ? 5 : 3));
  fx.hitstop = Math.max(fx.hitstop, isSpecial ? 5 : (a.type === "kick" ? 7 : 5));
  sfx(a.type === "kick" ? "kick" : "punch", 0.75);

  if (def.hp <= 0) { doKO(att, def); return; }

  if (a.knockdown) {
    def.state = "knockdown"; def.st = 0; def.stun = 0; def.onGround = (a.kbUp ? false : true);
    if (a.kbUp) { def.vy = a.kbUp; def.onGround = false; }
    def.vx = att.facing * kb * 0.7;
  } else {
    def.state = "hit"; def.stun = a.hitstun || 14;
  }
}
function gainMeter(f, n) {
  if (match.mode === "training") { f.meter = MAXMETER; return; }
  const was = f.meter; f.meter = Math.min(MAXMETER, f.meter + n);
  if (was < MAXMETER && f.meter >= MAXMETER) { f.superFlash = 30; }
}
function doKO(att, def) {
  def.hp = 0; def.state = "ko"; def.st = 0; def.vx = att.facing * 6; def.vy = -8; def.onGround = false;
  spawnSpark(def.x, def.y - 150, att.cd.theme.glow, 16);
  shake(12); fx.hitstop = 16; fx.slowmo = 50;
}

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// keep fighters from overlapping (pushboxes)
function separate(a, b) {
  const minDist = 86;
  const d = b.x - a.x;
  if (Math.abs(d) < minDist && a.onGround && b.onGround) {
    const push = (minDist - Math.abs(d)) / 2 * Math.sign(d || 1);
    a.x = clamp(a.x - push, WALL_L, WALL_R);
    b.x = clamp(b.x + push, WALL_L, WALL_R);
  }
}

// ===========================================================================
//  AI
// ===========================================================================
function aiInput(f, opp) {
  const IN = { left: false, right: false, up: false, down: false, punch: false, kick: false, block: false, jump: false, special: false };
  if (!actionable(f) && f.state !== "idle" && f.state !== "walk") return IN;
  const ai = f.ai; ai.t--;
  const dist = Math.abs(opp.x - f.x);
  const dir = Math.sign(opp.x - f.x) || f.facing;

  // block when opponent attacks at close range
  const oppAttacking = opp.state === "attack" || opp.state === "special";
  if (oppAttacking && dist < 150 && ai.blockT <= 0 && chance(0.5)) ai.blockT = 16 + (rng() * 12 | 0);
  if (ai.blockT > 0) { ai.blockT--; IN.block = true; return IN; }

  // special when ready and in range
  if (f.meter >= MAXMETER && dist < 200 && chance(0.06)) { IN.special = true; return IN; }

  if (ai.cool > 0) ai.cool--;

  if (dist > f.cd.kick.range - 6) {
    // approach
    if (dir > 0) IN.right = true; else IN.left = true;
    if (chance(0.012)) IN.jump = true;
  } else {
    // in range: attack
    if (ai.cool <= 0 && chance(0.10)) {
      if (dist < f.cd.punch.range && chance(0.55)) IN.punch = true; else IN.kick = true;
      ai.cool = 16 + (rng() * 22 | 0);
    } else if (chance(0.02)) {
      // back off
      if (dir > 0) IN.left = true; else IN.right = true;
    } else if (chance(0.01)) IN.jump = true;
  }
  return IN;
}

// ===========================================================================
//  EFFECTS (particles, trails, shake, hitstop, slowmo)
// ===========================================================================
const fx = { shakeT: 0, shakeMag: 0, hitstop: 0, slowmo: 0, flashScreen: 0, flashCol: "#fff" };
const parts = [];
function shake(m) { fx.shakeMag = Math.max(fx.shakeMag, m); fx.shakeT = Math.max(fx.shakeT, 12); }
function spawnSpark(x, y, color, n) {
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: rand(-5, 5), vy: rand(-6, 2), life: rand(14, 26), max: 26, color, size: rand(2, 5), grav: 0.25 });
}
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ x: x + rand(-18, 18), y: y - 4, vx: rand(-1.6, 1.6), vy: rand(-2.4, -0.4), life: rand(10, 18), max: 18, color: "#caa46b", size: rand(2, 4), grav: 0.06 });
}
function updateParts() {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.vy += p.grav; p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) parts.splice(i, 1);
  }
}
function pushTrail(f) {
  const an = f.cd.anim[f.animName] || f.cd.anim.idle;
  const frameIdx = (an.frameStart || 0) + Math.min(f.animFrame, an.frames - 1);
  f.trail.push({ x: f.x, y: f.y, key: an.key, frame: frameIdx, flip: f.facing !== f.cd.nativeFacing, life: 10 });
  if (f.trail.length > 6) f.trail.shift();
}
function decayTrails(f) { for (let i = f.trail.length - 1; i >= 0; i--) { if (--f.trail[i].life <= 0) f.trail.splice(i, 1); } }

// ---------- animation state machine ----------
function animForState(f) {
  switch (f.state) {
    case "ko": return "ko";
    case "knockdown": return "hit";
    case "hit": return "hit";
    case "special_hurt": return "hit";
    case "special_cinematic": return f.spAnim || "special";
    case "win": return "win";
    case "block": return "block";
    case "crouch": return "crouch";
    case "special": return f.spAnim || "special";
    case "attack": return (f.atk && f.atk.type === "kick") ? "kick" : "punch";
  }
  if (!f.onGround) return "jump";
  if (f.state === "walk") return "walk";
  return "idle";
}
function setAnim(f, name) {
  if (f.animName === name) return;
  f.animName = name; f.animFrame = 0; f.animElapsed = 0;
}
function advanceAnim(f) {
  const an = f.cd.anim[f.animName]; if (!an) return;
  f.animElapsed++;
  if (f.animElapsed >= an.hold) {
    f.animElapsed = 0;
    if (f.animFrame < an.frames - 1) f.animFrame++;
    else if (an.loop) f.animFrame = 0;   // non-loop clamps on its final frame
  }
}
function tickAnim(f) { setAnim(f, animForState(f)); advanceAnim(f); }

// ===========================================================================
//  MATCH STATE
// ===========================================================================
const ROUND_TIME = 60;
const match = {
  scene: "title",     // title | mode | char | stage | fight | matchover
  mode: "arcade",
  p1char: "brandon", p2char: "garet", stage: 0,
  fighters: [null, null],
  roundNum: 1, timer: ROUND_TIME, timerF: 0,
  phase: "intro", phaseT: 0,
  banner: "", bannerT: 0, winner: -1,
  specialSeq: null,
};
// menu cursors
const menu = { modeIdx: 0, p1sel: 0, p1lock: false, p2sel: 1, p2lock: false, stageIdx: 0, overIdx: 0 };
const MODES = ["arcade", "versus", "training"];

function startFightScene() {
  match.fighters[0] = makeFighter(match.p1char, 0, false);
  match.fighters[1] = makeFighter(match.p2char, 1, match.mode === "arcade");
  warmCutscene(match.fighters[0].cd.cinematic.cutscene);
  warmCutscene(match.fighters[1].cd.cinematic.cutscene);
  match.fighters[0].roundWins = 0; match.fighters[1].roundWins = 0;
  match.roundNum = 1;
  match.scene = "fight";
  beginRound();
}
function beginRound() {
  match.specialSeq = null;
  resetForRound(match.fighters[0], 0);
  resetForRound(match.fighters[1], 1);
  match.timer = ROUND_TIME; match.timerF = 0;
  match.phase = "intro"; match.phaseT = 0;
  const rn = match.roundNum;
  match.banner = rn === 1 ? STR.round1 : rn === 2 ? STR.round2 : STR.round3;
  match.bannerT = 80;
  vo(rn === 1 ? "round1" : rn === 2 ? "round2" : "round3");
}
function endRound(winnerSide, reason) {
  match.phase = "roundover"; match.phaseT = 0;
  match.banner = reason; match.bannerT = 150;
  if (match.specialSeq) stopCutscenePlayback(match.specialSeq.cutscene);
  match.specialSeq = null;
  if (reason === STR.ko) vo("ko");
  if (winnerSide >= 0) {
    match.fighters[winnerSide].roundWins++;
    match.fighters[winnerSide].state = "win";
    match.fighters[winnerSide].anim = 0;
  }
  match.winner = winnerSide;
}

function updateCinematicSpecial() {
  const seq = match.specialSeq;
  if (!seq) return false;
  const attacker = match.fighters[seq.attackerSide];
  const defender = match.fighters[seq.defenderSide];
  lockCinematicFrame(attacker, "special_cinematic");
  lockCinematicFrame(defender, "special_hurt");
  attacker.facing = defender.x >= attacker.x ? 1 : -1;
  defender.facing = attacker.x >= defender.x ? 1 : -1;

  seq.phaseT++;
  seq.totalT++;
  if (seq.phase === "attacker_anim" && seq.phaseT % 3 === 0) pushTrail(attacker);
  if (seq.phase === "defender_hurt") {
    defender.flash = (seq.phaseT % 8 < 4) ? 8 : 0;
    defender.flashColor = attacker.cd.cinematic.hurtTint || attacker.cd.theme.glow;
    defender.recoil = 6;
    if (!seq.damageApplied && seq.phaseT >= CINEMATIC_SPECIAL_DAMAGE_FRAME) {
      seq.damageApplied = true;
      defender.hp = Math.max(0, defender.hp - CINEMATIC_SPECIAL_DAMAGE);
      spawnSpark(defender.x, defender.y - 150, attacker.cd.theme.glow, 18);
      spawnSpark(defender.x, defender.y - 150, "#ffffff", 6);
      shake(12);
      sfx("kick", 0.85);
      if (defender.hp <= 0) {
        seq.ko = true;
        doKO(attacker, defender);
        stopCutscenePlayback(seq.cutscene);
        match.specialSeq = null;
        return false;
      }
    }
  }

  if (seq.phase === "overlay" &&
      seq.phaseT >= CINEMATIC_SPECIAL_DUR.overlay &&
      seq.phaseT < CINEMATIC_SPECIAL_MAX_OVERLAY_WAIT &&
      !cutsceneReadyForPlayback(seq.cutscene)) {
    return true;
  }
  if (seq.phaseT < cinematicSpecialPhaseDuration(seq)) return true;
  const next = CINEMATIC_SPECIAL_PHASES[CINEMATIC_SPECIAL_PHASES.indexOf(seq.phase) + 1];
  if (next) {
    if (seq.phase === "cinematic") stopCutscenePlayback(seq.cutscene);
    seq.phase = next;
    seq.phaseT = 0;
    if (seq.phase === "cinematic") {
      seq.videoFrames = cutsceneDurationFrames(seq.cutscene);
      startCutscenePlayback(seq.cutscene);
    }
    return true;
  }

  stopCutscenePlayback(seq.cutscene);
  if (!seq.ko) {
    attacker.state = "idle"; attacker.st = 0; attacker.sp = null; attacker.lunge = 0;
    defender.state = "idle"; defender.st = 0; defender.stun = 0; defender.recoil = 0; defender.flash = 0;
  }
  match.specialSeq = null;
  return false;
}
function lockCinematicFrame(f, state) {
  if (f.state !== "ko") f.state = state;
  f.vx = 0; f.vy = 0; f.onGround = true; f.y = stageFloor();
  f.heldBlock = false; f.blockFx = 0; f.stun = 0; f.invuln = 0;
}

function cinematicSpecialPhaseDuration(seq) {
  return seq.phase === "cinematic" ? seq.videoFrames : CINEMATIC_SPECIAL_DUR[seq.phase];
}

function updateFight() {
  const [a, b] = match.fighters;
  // advance sprite animation for both fighters (runs in every phase; frozen
  // during hitstop because updateFight isn't called then)
  tickAnim(a); tickAnim(b);

  // phase timing
  if (match.phase === "intro") {
    match.phaseT++;
    if (match.phaseT === 70) { match.banner = STR.fight; match.bannerT = 50; vo("fight"); }
    if (match.phaseT >= 96) { match.phase = "fight"; match.bannerT = 0; }
    // idle breathing only
    decayTrails(a); decayTrails(b); updateParts();
    if (match.bannerT > 0) match.bannerT--;
    return;
  }

  if (match.phase === "fight") {
    if (match.specialSeq) {
      updateCinematicSpecial();
      decayTrails(a); decayTrails(b); updateParts();
      if (a.flash > 0) a.flash--; if (b.flash > 0) b.flash--;
      if (a.superFlash > 0) a.superFlash--; if (b.superFlash > 0) b.superFlash--;
      return;
    }

    // timer
    match.timerF++;
    if (match.timerF >= 60) { match.timerF = 0; match.timer--; }

    const IN_A = a.isCPU ? aiInput(a, b) : humanInput(0);
    const IN_B = b.isCPU ? aiInput(b, a) : humanInput(1);
    fighterControl(a, b, IN_A);
    if (!match.specialSeq) fighterControl(b, a, IN_B);
    if (!match.specialSeq) separate(a, b);
    decayTrails(a); decayTrails(b); updateParts();
    if (a.blockFx > 0) a.blockFx--; if (b.blockFx > 0) b.blockFx--;
    if (a.flash > 0) a.flash--; if (b.flash > 0) b.flash--;
    if (a.superFlash > 0) a.superFlash--; if (b.superFlash > 0) b.superFlash--;

    // round end checks
    if (match.mode === "training") {
      if (a.hp <= 0) { a.hp = MAXHP; a.state = "idle"; }
      if (b.hp <= 0) { b.hp = MAXHP; b.state = "idle"; }
      return;
    }
    if (a.state === "ko" || b.state === "ko") {
      // let KO animation play a beat
      if (a.hp <= 0 && b.hp <= 0) endRound(-1, STR.draw);
      else endRound(a.hp <= 0 ? 1 : 0, STR.ko);
      return;
    }
    if (match.timer <= 0) {
      match.timer = 0;
      const w = a.hp === b.hp ? -1 : (a.hp > b.hp ? 0 : 1);
      endRound(w, STR.timeUp);
      return;
    }
    return;
  }

  if (match.phase === "roundover") {
    match.phaseT++;
    if (match.bannerT > 0) match.bannerT--;
    // keep physics settling
    const IN0 = emptyInput();
    fighterControl(a, b, IN0); fighterControl(b, a, IN0);
    decayTrails(a); decayTrails(b); updateParts();
    if (match.phaseT >= 150) {
      if (a.roundWins >= 2 || b.roundWins >= 2) {
        match.scene = "matchover";
        match.winner = a.roundWins >= 2 ? 0 : 1;
        menu.overIdx = 0;
        vo("win");
      } else {
        match.roundNum++;
        beginRound();
      }
    }
    return;
  }
}

function humanInput(p) {
  return {
    left: held(p, "left"), right: held(p, "right"), down: held(p, "down"), block: held(p, "block"),
    jump: pressed(p, "up"), punch: pressed(p, "punch"), kick: pressed(p, "kick"), special: pressed(p, "special"),
  };
}

// ===========================================================================
//  RENDERING
// ===========================================================================
// Draw height for an asset. "fixed" uses ONE scale taken from the idle pose so
// the body stays the same size while limbs extend. "fit" is kept around in case
// we restore true sprite sheets later.
function effH(cd, key, anim) {
  const a = ASSET[key]; if (!a) return cd.drawH;
  const animScale = anim && anim.scale ? anim.scale : 1;
  if (a.ft > 1) return cd.drawH * animScale;
  if (cd.scaleMode === "fixed") {
    const ref = ASSET[cd.anim.idle.key];
    return a.srcH * (cd.drawH / (ref ? ref.srcH : a.srcH)) * animScale;
  }
  return cd.drawH * animScale;
}

function drawFighter(f) {
  const an = f.cd.anim[f.animName] || f.cd.anim.idle;
  const key = an.key;
  const frameIdx = (an.frameStart || 0) + Math.min(f.animFrame, an.frames - 1);
  const H = effH(f.cd, key, an);
  const flip = f.facing !== f.cd.nativeFacing;

  // juice offsets: lunge into attacks, recoil on hit, bouncing run on single-pose walk
  let drawX = f.x, drawY = f.y, rot = 0;
  if (f.state === "attack" || f.state === "special") drawX += f.lunge * f.facing;
  if (f.recoil > 0) drawX += -f.facing * f.recoil * 0.5;
  const singlePoseWalk = (f.state === "walk" && an.frames === 1);
  if (singlePoseWalk) {
    drawY -= Math.abs(Math.sin(f.walkPhase)) * 10;     // vertical bounce
    rot = Math.sin(f.walkPhase * 2) * 0.07;            // running rock
  }

  // ground shadow (always at the real floor under the fighter)
  ctx.save();
  ctx.globalAlpha = 0.32; ctx.fillStyle = "#000";
  ctx.beginPath();
  const sw = 60 - (f.onGround ? 0 : 22);
  ctx.ellipse(f.x, stageFloor() + 8, sw, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // afterimage trails (dash / special)
  for (const t of f.trail)
    drawCell(t.key, t.frame, t.x, t.y, effH(f.cd, t.key), t.flip, { tint: f.cd.theme.main, alpha: 0.16 * (t.life / 10) });

  // body (with optional running rock around the feet)
  if (rot) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(rot); ctx.translate(-f.x, -f.y); }
  drawCell(key, frameIdx, drawX, drawY, H, flip);
  // hit flash
  if (f.flash > 0) drawCell(key, frameIdx, drawX, drawY, H, flip, { tint: f.flashColor, alpha: f.flash / 6 * 0.85 });
  if (rot) ctx.restore();

  // block shield
  if (f.state === "block" && (f.heldBlock || f.blockFx > 0)) {
    ctx.save();
    ctx.globalAlpha = f.blockFx > 0 ? 0.8 : 0.4;
    ctx.strokeStyle = "#9bffec"; ctx.lineWidth = 4; ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(f.x + f.facing * 40, f.y - H * 0.45, 58, -1.1, 1.1); ctx.stroke();
    ctx.restore();
  }
}

function drawParts() {
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawStage() {
  const st = STAGES[match.stage];
  const img = BG[st.bg];
  if (img) {
    ctx.drawImage(img, 0, 0, VW, VH);
  } else { ctx.fillStyle = "#241b3a"; ctx.fillRect(0, 0, VW, VH); }
  if (st.overlay) {
    const overlay = BG[st.overlay.bg];
    if (overlay) {
      const frames = st.overlay.frames || 1;
      const hold = st.overlay.hold || 8;
      const frame = Math.floor(frameCount / hold) % frames;
      const sw = overlay.width / frames;
      ctx.drawImage(overlay, frame * sw, 0, sw, overlay.height, 0, 0, VW, VH);
    }
  }
  // floor shade line for grounding
  const floor = stageFloor();
  const g = ctx.createLinearGradient(0, floor - 10, 0, VH);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g; ctx.fillRect(0, floor - 10, VW, VH - floor + 10);
}

// neon text helper
function neonText(text, x, y, size, col, glow, align = "center", weight = "900") {
  ctx.save();
  ctx.font = `${weight} ${size}px "Trebuchet MS", system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size * 0.12); ctx.strokeStyle = "#0a0712"; ctx.strokeText(text, x, y);
  ctx.shadowColor = glow; ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = col; ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBar(x, y, w, h, frac, col, glow, rightAlign) {
  ctx.save();
  ctx.fillStyle = "rgba(8,6,16,0.8)"; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = "#241c3a"; ctx.fillRect(x, y, w, h);
  const fw = Math.max(0, Math.min(1, frac)) * w;
  ctx.shadowColor = glow; ctx.shadowBlur = 10; ctx.fillStyle = col;
  if (rightAlign) ctx.fillRect(x + w - fw, y, fw, h); else ctx.fillRect(x, y, fw, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawHUD() {
  const [a, b] = match.fighters;
  // health bars
  const bw = 480, bh = 26, top = 34;
  drawBar(40, top, bw, bh, a.hp / MAXHP, "#ff5c33", "#ff7a33", false);
  drawBar(VW - 40 - bw, top, bw, bh, b.hp / MAXHP, "#ff5c33", "#ff7a33", true);
  // names
  neonText(a.cd.name, 44, top + bh + 18, 22, "#ffe6c2", a.cd.theme.glow, "left");
  neonText(b.cd.name, VW - 44, top + bh + 18, 22, "#ffe6c2", b.cd.theme.glow, "right");
  // tags
  ctx.save(); ctx.font = "700 13px 'Trebuchet MS'"; ctx.fillStyle = "#8d7fb6";
  ctx.textAlign = "left"; ctx.fillText(a.cd.tag, 150, top + bh + 18);
  ctx.textAlign = "right"; ctx.fillText(b.cd.tag, VW - 150, top + bh + 18); ctx.restore();
  // meter bars
  drawBar(40, top + bh + 32, bw, 12, a.meter / MAXMETER, a.meter>=100?"#fff04a":"#00e5ff", "#00e5ff", false);
  drawBar(VW - 40 - bw, top + bh + 32, bw, 12, b.meter / MAXMETER, b.meter>=100?"#fff04a":"#00e5ff", "#00e5ff", true);
  if (a.meter >= 100 && (frameCount >> 3) % 2) neonText(STR.superReady, 40 + bw/2, top + bh + 38, 13, "#fff04a", "#ffce4a");
  if (b.meter >= 100 && (frameCount >> 3) % 2) neonText(STR.superReady, VW - 40 - bw/2, top + bh + 38, 13, "#fff04a", "#ffce4a");

  // round-win pips
  for (let i = 0; i < 2; i++) {
    pip(150 + i * 22, top - 14, a.roundWins > i);
    pip(VW - 150 - i * 22, top - 14, b.roundWins > i);
  }
  // timer
  if (match.mode !== "training") {
    ctx.save();
    ctx.fillStyle = "rgba(8,6,16,0.8)"; ctx.fillRect(VW/2 - 52, 24, 104, 64);
    ctx.strokeStyle = "#00e5ff55"; ctx.strokeRect(VW/2 - 52, 24, 104, 64);
    neonText(String(match.timer).padStart(2, "0"), VW/2, 58, 46, match.timer <= 10 ? "#ff4a4a" : "#fff", "#00e5ff");
    ctx.restore();
  } else {
    neonText("TRAINING", VW/2, 50, 26, "#9bffec", "#00e5ff");
  }
}
function pip(x, y, on) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = on ? "#ffce4a" : "#3a2f55";
  if (on) { ctx.shadowColor = "#ffb33e"; ctx.shadowBlur = 10; }
  ctx.fill(); ctx.restore();
}

function controlsHintText() {
  return STR.controlsTitle + ":  " + STR.p1Controls + "      " + STR.p2Controls;
}

function drawBanner() {
  if (match.bannerT <= 0) return;
  const t = match.bannerT;
  const big = match.banner === STR.fight || match.banner === STR.ko;
  const scl = 1 + Math.max(0, (t - 130)) * 0.04;
  ctx.save();
  ctx.translate(VW / 2, VH * 0.40);
  ctx.scale(scl, scl);
  neonText(match.banner, 0, 0, big ? 96 : 76,
    match.banner === STR.ko ? "#ff3b3b" : "#ffce4a",
    match.banner === STR.ko ? "#ff5c33" : "#00e5ff");
  ctx.restore();
}

function drawCinematicSpecialPresentation() {
  const seq = match.specialSeq;
  if (!seq) return;
  const attacker = match.fighters[seq.attackerSide];
  const defender = match.fighters[seq.defenderSide];
  const theme = attacker.cd.theme;
  const phaseLen = cinematicSpecialPhaseDuration(seq) || 1;
  const p = Math.min(1, seq.phaseT / phaseLen);
  const pulse = 0.5 + Math.sin(seq.totalT * 0.18) * 0.5;

  ctx.save();
  if (seq.phase === "freeze") {
    ctx.globalAlpha = 0.18 + p * 0.25;
    ctx.fillStyle = theme.main;
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
    return;
  }

  if (seq.phase === "overlay") {
    const wipe = Math.min(1, seq.phaseT / CINEMATIC_SPECIAL_DUR.overlay);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, VW, VH);
    ctx.save();
    ctx.globalAlpha = 0.10 + pulse * 0.04;
    ctx.fillStyle = theme.main;
    ctx.translate(VW / 2, VH / 2);
    ctx.rotate(-0.14);
    ctx.fillRect(-VW * wipe, -78, VW * 2 * wipe, 156);
    ctx.restore();
    neonText(STR.specialOverlay, VW / 2, VH / 2, 112, theme.dark, theme.glow);
    neonText(attacker.cd.specialName, VW / 2, VH / 2 + 92, 34, theme.main, theme.glow);
    ctx.restore();
    return;
  }

  ctx.fillStyle = seq.phase === "recover" ? "rgba(8,6,16,0.30)" : "rgba(8,6,16,0.82)";
  ctx.fillRect(0, 0, VW, VH);

  const g = ctx.createLinearGradient(0, 0, VW, VH);
  g.addColorStop(0, theme.dark);
  g.addColorStop(0.52, "rgba(8,6,16,0.95)");
  g.addColorStop(1, theme.main);
  ctx.globalAlpha = seq.phase === "recover" ? 0.18 : 0.55;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  ctx.globalAlpha = 1;

  const videoDrawn = seq.phase === "cinematic" && drawCutsceneVideo(seq.cutscene);
  if (videoDrawn) {
    ctx.restore();
    return;
  }

  if (seq.phase === "overlay" || seq.phase === "cinematic") {
    const slashX = VW * (0.18 + p * 0.64);
    ctx.save();
    ctx.translate(slashX, VH / 2);
    ctx.rotate(-0.18);
    ctx.fillStyle = theme.main;
    ctx.globalAlpha = 0.22 + pulse * 0.12;
    ctx.fillRect(-520, -62, 1040, 124);
    ctx.restore();

    neonText(STR.specialOverlay, VW / 2, VH * 0.31, seq.phase === "overlay" ? 116 : 66, "#fff04a", theme.glow);
    neonText(attacker.cd.specialName, VW / 2, VH * 0.44, 44, "#ffffff", theme.main);
    neonText(attacker.cd.name, VW / 2, VH * 0.53, 26, "#ffe6c2", theme.glow);
    drawCinematicPortrait(attacker, VW * 0.22, VH + 18, 420, false, 0.35 + p * 0.25);
    drawCinematicPortrait(attacker, VW * 0.78, VH + 20, 420, true, 0.20);
  }

  if (seq.phase === "attacker_anim") {
    ctx.fillStyle = "rgba(8,6,16,0.68)";
    ctx.fillRect(0, 0, VW, VH);
  }

  if (seq.phase === "defender_hurt") {
    drawCinematicPortrait(attacker, VW * 0.24, VH - 16, 430, attacker.facing < 0, 0.92);
    drawCinematicPortrait(defender, VW * 0.72 + Math.sin(seq.phaseT * 0.9) * 16, VH - 8, 390, defender.facing < 0, 0.78);
  }

  if (seq.phase === "recover") {
    ctx.globalAlpha = 1 - p;
  }
  ctx.restore();
}

function drawCutsceneVideo(key) {
  const v = CUTSCENE[key];
  if (!v || v.readyState < 2 || !v.videoWidth || !v.videoHeight) return false;
  try {
    const videoAR = v.videoWidth / v.videoHeight;
    const viewAR = VW / VH;
    let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
    if (videoAR > viewAR) {
      sw = v.videoHeight * viewAR;
      sx = (v.videoWidth - sw) / 2;
    } else {
      sh = v.videoWidth / viewAR;
      sy = (v.videoHeight - sh) / 2;
    }
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, VW, VH);
    return true;
  } catch (e) {
    return false;
  }
}

function drawCinematicPortrait(f, x, y, h, flip, alpha) {
  const animName = f.state === "special_hurt" ? "hit" : (f.cd.cinematic.postAnim || "special");
  const an = f.cd.anim[animName] || f.cd.anim.special || f.cd.anim.idle;
  const frameIdx = (an.frameStart || 0) + Math.min(f.animFrame, an.frames - 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawCell(an.key, frameIdx, x, y, h, flip);
  if (f.state === "special_hurt") {
    drawCell(an.key, frameIdx, x, y, h, flip, { tint: f.flashColor || "#ffffff", alpha: 0.28 + Math.sin(frameCount * 0.6) * 0.18 });
  }
  ctx.restore();
}

// screen render dispatch
let frameCount = 0;
function render() {
  if (isTouch) buildTouchControls();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, VW, VH);

  if (match.scene === "fight" || match.scene === "matchover") {
    // shake
    let ox = 0, oy = 0;
    if (fx.shakeT > 0) { ox = rand(-1, 1) * fx.shakeMag; oy = rand(-1, 1) * fx.shakeMag; }
    ctx.save(); ctx.translate(ox, oy);
    drawStage();
    // slowmo vignette during special
    const [a, b] = match.fighters;
    // draw fighters back-to-front by x for slight depth
    const order = a.y <= b.y ? [a, b] : [b, a];
    drawFighter(order[0]); drawFighter(order[1]);
    drawParts();
    ctx.restore();

    if (fx.flashScreen > 0) {
      ctx.globalAlpha = fx.flashScreen / 12 * 0.5; ctx.fillStyle = fx.flashCol;
      ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1;
    }
    drawHUD();
    drawBanner();
    if (match.scene === "fight") hintBar(controlsHintText());
    if (match.scene === "matchover") drawMatchOver();
    drawCinematicSpecialPresentation();
  } else {
    drawMenuScene();
  }

  // touch controls
  drawTouchControls();
  frameCount++;
}

// ---------- menus ----------
function bgMenu() {
  if (match.scene === "title" && BG.mainmenu) {
    // exact MainMenu.png art, full-frame, no overlay or added titles
    ctx.drawImage(BG.mainmenu, 0, 0, VW, VH);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, "#1b1336"); g.addColorStop(1, "#0c0a16");
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // faint grid
    ctx.strokeStyle = "rgba(0,229,255,0.05)"; ctx.lineWidth = 1;
    for (let x = 0; x < VW; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
    for (let y = 0; y < VH; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
  }
}

function drawMenuScene() {
  bgMenu();
  if (match.scene === "title") drawTitle();
  else if (match.scene === "mode") drawModeSelect();
  else if (match.scene === "char") drawCharSelect();
  else if (match.scene === "stage") drawStageSelect();
}

function drawTitle() {
  // MainMenu.png already carries the logo/title art; show only the blinking
  // "click to start" prompt, nothing else.
  if ((frameCount >> 4) % 2) {
    ctx.save();
    ctx.fillStyle = "rgba(8,6,16,0.45)"; ctx.fillRect(VW / 2 - 230, VH - 116, 460, 56);
    ctx.restore();
    neonText(STR.pressStart, VW / 2, VH - 88, 32, "#fff", "#ff7a33");
  }
}

function panel(x, y, w, h, sel, col) {
  ctx.save();
  ctx.fillStyle = sel ? "rgba(0,229,255,0.12)" : "rgba(20,16,38,0.85)";
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = sel ? 4 : 2;
  ctx.strokeStyle = sel ? col : "#3a2f55";
  if (sel) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawModeSelect() {
  neonText(STR.modeHeader, VW / 2, 100, 48, "#ffce4a", "#ff5c33");
  const items = [[STR.modeArcade, STR.modeArcadeDesc], [STR.modeVersus, STR.modeVersusDesc], [STR.modeTraining, STR.modeTrainingDesc]];
  const w = 760, h = 96, x = VW / 2 - w / 2;
  items.forEach((it, i) => {
    const y = 210 + i * 120;
    panel(x, y, w, h, menu.modeIdx === i, "#00e5ff");
    neonText(it[0], x + 36, y + h / 2 - 8, 38, "#fff", menu.modeIdx === i ? "#00e5ff" : "#000", "left");
    ctx.save(); ctx.font = "600 17px 'Trebuchet MS'"; ctx.fillStyle = "#a99ccc"; ctx.textAlign = "left";
    ctx.fillText(it[1], x + 38, y + h / 2 + 24); ctx.restore();
  });
  hintBar(controlsHintText());
}

function drawCharPortrait(charKey, x, y, w, h, sel, col, label, locked) {
  panel(x, y, w, h, sel, col);
  const cd = CHARS[charKey];
  const idle = cd.anim.idle;
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 4, y + 4, w - 8, h - 50); ctx.clip();
  if (locked) { ctx.shadowColor = col; ctx.shadowBlur = 24; }
  // idle frame 0, scaled to the panel, feet just above the name plate
  drawCell(idle.key, idle.frameStart || 0, x + w / 2, y + h - 50, h - 90, false,
    { alpha: locked ? 1 : (sel ? 1 : 0.85) });
  ctx.restore();
  // name plate
  ctx.fillStyle = "rgba(8,6,16,0.85)"; ctx.fillRect(x, y + h - 46, w, 46);
  neonText(cd.name, x + w / 2, y + h - 23, 26, "#fff", col);
  if (label) neonText(label, x + w / 2, y - 18, 22, col, col);
  if (locked) neonText("LOCKED", x + w / 2, y + 22, 18, "#ffce4a", "#ff7a33");
}

function drawCharSelect() {
  neonText(STR.charHeader, VW / 2, 80, 44, "#ffce4a", "#ff5c33");
  const w = CHAR_LIST.length > 4 ? 200 : (CHAR_LIST.length > 3 ? 230 : (CHAR_LIST.length > 2 ? 270 : 320));
  const h = CHAR_LIST.length > 4 ? 390 : (CHAR_LIST.length > 3 ? 410 : 430);
  const gap = CHAR_LIST.length > 4 ? 18 : (CHAR_LIST.length > 3 ? 26 : (CHAR_LIST.length > 2 ? 44 : 80));
  const totalW = w * CHAR_LIST.length + gap * (CHAR_LIST.length - 1), x0 = VW / 2 - totalW / 2, y = 155;
  const twoP = match.mode !== "arcade";
  CHAR_LIST.forEach((ck, i) => {
    const x = x0 + i * (w + gap);
    const selBy = [];
    if (menu.p1sel === i) selBy.push("p1");
    if (twoP && menu.p2sel === i) selBy.push("p2");
    const col = menu.p1sel === i && !menu.p1lock ? "#ff7a33" : (twoP && menu.p2sel === i ? "#00e5ff" : "#3a2f55");
    drawCharPortrait(ck, x, y, w, h, selBy.length > 0, selBy.includes("p1") ? "#ff7a33" : "#00e5ff", "", false);
    // cursor labels
    if (menu.p1sel === i) neonText(menu.p1lock ? STR.p1 + " ✔" : STR.p1, x + 50, y - 18, 24, "#ff7a33", "#ff7a33");
    if (twoP && menu.p2sel === i) neonText(menu.p2lock ? STR.p2 + " ✔" : STR.p2, x + w - 50, y - 18, 24, "#00e5ff", "#00e5ff");
    if (match.mode === "arcade" && i !== menu.p1sel) neonText(STR.cpu, x + w - 50, y - 18, 22, "#00e5ff", "#00e5ff");
    // special name
    neonText(CHARS[ck].specialName, x + w / 2, y + h + 26, 17, "#9bffec", "#00e5ff");
  });
  let prompt = STR.charPrompt;
  if (twoP) {
    if (!menu.p1lock) prompt = STR.lockP1;
    else if (!menu.p2lock) prompt = STR.lockP2;
    else prompt = STR.bothLocked;
  }
  if ((frameCount >> 4) % 2 || (twoP && menu.p1lock && !menu.p2lock)) neonText(prompt, VW / 2, VH - 70, 26, "#fff", "#ff7a33");
  hintBar(controlsHintText());
}

function drawStageSelect() {
  neonText(STR.stageHeader, VW / 2, 90, 46, "#ffce4a", "#ff5c33");
  const cols = stageSelectCols();
  const w = STAGES.length > 4 ? 360 : (STAGES.length > 2 ? 420 : 460);
  const h = STAGES.length > 4 ? 200 : (STAGES.length > 2 ? 220 : 300);
  const gapX = STAGES.length > 4 ? 45 : 70, gapY = 34;
  const totalW = w * cols + gapX * (cols - 1);
  const x0 = VW / 2 - totalW / 2, y0 = STAGES.length > 2 ? 150 : 190;
  STAGES.forEach((st, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = x0 + col * (w + gapX), y = y0 + row * (h + gapY);
    panel(x, y, w, h, menu.stageIdx === i, "#00e5ff");
    const img = BG[st.bg];
    if (img) { ctx.save(); ctx.beginPath(); ctx.rect(x + 6, y + 6, w - 12, h - 56); ctx.clip();
      ctx.drawImage(img, x + 6, y + 6, w - 12, h - 56); ctx.restore(); }
    ctx.fillStyle = "rgba(8,6,16,0.85)"; ctx.fillRect(x, y + h - 46, w, 46);
    neonText(st.name, x + w / 2, y + h - 23, 28, "#fff", "#00e5ff");
  });
  neonText(STR.stagePrompt, VW / 2, VH - 80, 24, "#fff", "#ff7a33");
  hintBar(controlsHintText());
}

function drawMatchOver() {
  ctx.fillStyle = "rgba(8,6,16,0.6)"; ctx.fillRect(0, 0, VW, VH);
  const wf = match.fighters[match.winner];
  if (!wf) return;
  neonText(wf.cd.name + " " + STR.wins, VW / 2, 220, 86, "#ffce4a", "#ff5c33");
  neonText(wf.cd.tag, VW / 2, 300, 30, wf.cd.theme.main, wf.cd.theme.glow);
  const opts = [STR.rematch, STR.menu];
  opts.forEach((o, i) => {
    const y = 430 + i * 90, w = 360, x = VW / 2 - w / 2;
    panel(x, y, w, 70, menu.overIdx === i, "#00e5ff");
    neonText(o, VW / 2, y + 35, 32, "#fff", menu.overIdx === i ? "#00e5ff" : "#000");
  });
  hintBar(controlsHintText());
}

function hintBar(text) {
  ctx.save();
  ctx.fillStyle = "rgba(8,6,16,0.6)"; ctx.fillRect(0, VH - 30, VW, 30);
  ctx.font = "600 14px 'Trebuchet MS'"; ctx.fillStyle = "#8d7fb6"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, VW / 2, VH - 15); ctx.restore();
}

// ---------- touch controls ----------
function buildTouchControls() {
  clearTouch();
  if (!isTouch) return;
  if (match.specialSeq) return;
  if (match.scene === "mode" || match.scene === "char" || match.scene === "stage" || match.scene === "matchover") {
    const by = VH - 116, s = 92;
    const vert = (match.scene === "mode" || match.scene === "matchover");
    addBtn(56, by, s, s, vert ? "0:up" : "0:left", vert ? "▲" : "◀");
    addBtn(56 + s + 18, by, s, s, vert ? "0:down" : "0:right", vert ? "▼" : "▶");
    addBtn(VW - 56 - 2 * s - 18, by, s, s, "back", "BACK");
    addBtn(VW - 56 - s, by, s, s, "confirm", "OK");
    return;
  }
  if (match.scene === "fight") {
    const players = match.mode === "arcade" ? [0] : [0, 1];
    for (const p of players) {
      const baseY = VH - 200;
      const lx = p === 0 ? 40 : VW - 40 - 380;
      // dpad-ish
      addBtn(lx, baseY + 40, 70, 70, p + ":left", "◀");
      addBtn(lx + 150, baseY + 40, 70, 70, p + ":right", "▶");
      addBtn(lx + 75, baseY - 30, 70, 70, p + ":up", "▲");
      addBtn(lx + 75, baseY + 110, 70, 70, p + ":down", "▼");
      // actions
      const rx = p === 0 ? VW - 40 - 230 : 40;
      addBtn(rx, baseY + 40, 66, 66, p + ":punch", "P");
      addBtn(rx + 80, baseY + 40, 66, 66, p + ":kick", "K");
      addBtn(rx + 40, baseY - 30, 66, 66, p + ":block", "BLK");
      addBtn(rx + 40, baseY + 120, 66, 66, p + ":special", "★");
    }
  }
}
function drawTouchControls() {
  if (match.specialSeq) return;
  if (!isTouch || touchButtons.length === 0) return;
  ctx.save();
  for (const b of touchButtons) {
    const on = [...touchActive.values()].includes(b.tok);
    ctx.globalAlpha = on ? 0.55 : 0.28;
    ctx.fillStyle = b.tok.endsWith("special") ? "#ffce4a" : (b.tok.endsWith("punch") || b.tok.endsWith("kick") ? "#00e5ff" : "#ffffff");
    roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.globalAlpha = 0.95; ctx.fillStyle = "#0c0a16"; ctx.font = "800 22px 'Trebuchet MS'";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
  }
  ctx.restore();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ===========================================================================
//  MENU NAVIGATION (consumes input edges)
// ===========================================================================
function navEdge(dir) { // dir 'left''right''up''down' from either player
  return pressed(0, dir) || pressed(1, dir);
}
const confirmPressed = () => confirmEdge || pressed(0, "punch") || pressed(1, "punch");
const backPressed = () => backEdge;

function updateMenus() {
  if (match.scene === "title") {
    if (confirmPressed() || anyKeyEdge) { match.scene = "mode"; buildTouchControls(); }
    return;
  }
  if (match.scene === "mode") {
    if (navEdge("up")) menu.modeIdx = (menu.modeIdx + 2) % 3;
    if (navEdge("down")) menu.modeIdx = (menu.modeIdx + 1) % 3;
    if (backPressed()) { match.scene = "title"; return; }
    if (confirmPressed()) {
      match.mode = MODES[menu.modeIdx];
      menu.p1sel = 0; menu.p1lock = false; menu.p2sel = 1; menu.p2lock = false;
      match.scene = "char";
    }
    return;
  }
  if (match.scene === "char") {
    const twoP = match.mode !== "arcade";
    // character select uses the same menu-style left/right navigation as the rest of the menus
    if (!menu.p1lock) {
      if (navEdge("left")) menu.p1sel = (menu.p1sel + CHAR_LIST.length - 1) % CHAR_LIST.length;
      if (navEdge("right")) menu.p1sel = (menu.p1sel + 1) % CHAR_LIST.length;
      if (pressed(0, "punch")) menu.p1lock = true;
    }
    if (twoP && !menu.p2lock) {
      if (menu.p1lock) {
        if (navEdge("left")) menu.p2sel = (menu.p2sel + CHAR_LIST.length - 1) % CHAR_LIST.length;
        if (navEdge("right")) menu.p2sel = (menu.p2sel + 1) % CHAR_LIST.length;
      }
      if (pressed(1, "punch")) menu.p2lock = true;
    }
    // Enter / OK locks the next un-locked player, so one person can lock both in Versus
    if (confirmEdge) {
      if (!menu.p1lock) menu.p1lock = true;
      else if (twoP && !menu.p2lock) menu.p2lock = true;
    }
    if (backPressed()) {
      if (menu.p2lock) menu.p2lock = false;
      else if (menu.p1lock) menu.p1lock = false;
      else match.scene = "mode";
    }
    const ready = twoP ? (menu.p1lock && menu.p2lock) : menu.p1lock;
    if (ready) {
      match.p1char = CHAR_LIST[menu.p1sel];
      match.p2char = twoP ? CHAR_LIST[menu.p2sel] : CHAR_LIST[(menu.p1sel + 1) % CHAR_LIST.length];
      if (match.mode === "arcade") match.p2char = CHAR_LIST[(menu.p1sel + 1) % CHAR_LIST.length]; // CPU takes the next fighter
      menu.stageIdx = 0;
      match.scene = "stage";
    }
    return;
  }
  if (match.scene === "stage") {
    const stageCols = stageSelectCols();
    if (navEdge("left")) menu.stageIdx = (menu.stageIdx + STAGES.length - 1) % STAGES.length;
    if (navEdge("right")) menu.stageIdx = (menu.stageIdx + 1) % STAGES.length;
    if (navEdge("up")) menu.stageIdx = (menu.stageIdx + STAGES.length - stageCols) % STAGES.length;
    if (navEdge("down")) menu.stageIdx = (menu.stageIdx + stageCols) % STAGES.length;
    if (backPressed()) { match.scene = "char"; menu.p1lock = false; menu.p2lock = false; return; }
    if (confirmPressed()) { match.stage = menu.stageIdx; startFightScene(); buildTouchControls(); }
    return;
  }
}

function updateMatchOver() {
  if (navEdge("up")) menu.overIdx = (menu.overIdx + 1) % 2;
  if (navEdge("down")) menu.overIdx = (menu.overIdx + 1) % 2;
  if (confirmPressed()) {
    if (menu.overIdx === 0) { startFightScene(); }
    else { match.scene = "title"; clearTouch(); }
  }
}

// pause
let paused = false;
function togglePause() { if (match.scene === "fight") paused = !paused; }

// ===========================================================================
//  MAIN LOOP (fixed timestep)
// ===========================================================================
const STEP = 1000 / 60;
let acc = 0, last = performance.now(), slowToggle = false;
const devOn = new URLSearchParams(location.search).has("dev");
if (devOn) document.getElementById("dev").style.display = "block";
let simCount = 0, fpsT = last, fps = 0;

function step() {
  beginFrameInput();

  // global pause toggle + quit-to-menu while paused
  if (match.scene === "fight") {
    if (backEdge) paused = !paused;
    else if (paused && (confirmEdge || frameEdge.has("0:punch") || frameEdge.has("1:punch"))) {
      paused = false; match.scene = "title"; clearTouch();
    }
  }

  if (!audioReady && anyKeyEdge) unlockAudio();

  if (match.scene === "fight") {
    if (!paused) {
      // hitstop freezes simulation but not particles much
      if (fx.hitstop > 0) { fx.hitstop--; }
      else {
        if (fx.slowmo > 0) { fx.slowmo--; slowToggle = !slowToggle; if (slowToggle) updateFight(); }
        else updateFight();
      }
      if (fx.shakeT > 0) { fx.shakeT--; fx.shakeMag *= 0.86; }
      if (fx.flashScreen > 0) fx.flashScreen--;
    }
  } else if (match.scene === "matchover") {
    updateMatchOver();
    if (fx.shakeT > 0) { fx.shakeT--; fx.shakeMag *= 0.86; }
  } else {
    updateMenus();
  }
  endFrameInput();
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = now - last; last = now;
  if (dt > 250) dt = STEP; // tab regained focus
  acc += dt;
  let guard = 0;
  while (acc >= STEP && guard < 6) { step(); acc -= STEP; guard++; simCount++; }
  render();
  if (paused && match.scene === "fight") drawPauseOverlay();

  if (devOn && now - fpsT >= 500) {
    fps = Math.round(simCount * 1000 / (now - fpsT)); simCount = 0; fpsT = now;
    const f0 = match.fighters[0];
    document.getElementById("dev").textContent =
      `${fps} fps | parts ${parts.length} | scene ${match.scene}` + (f0 ? ` | p1 ${f0.state} hp ${f0.hp|0} m ${f0.meter|0}` : "");
  }
}

function drawPauseOverlay() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(8,6,16,0.7)"; ctx.fillRect(0, 0, VW, VH);
  neonText(STR.paused, VW / 2, 240, 80, "#ffce4a", "#ff5c33");
  neonText(STR.resume + "  ( ESC )", VW / 2, 380, 30, "#fff", "#00e5ff");
  neonText(STR.quit + "  ( ENTER )", VW / 2, 440, 24, "#a99ccc", "#00e5ff");
}

// ===========================================================================
//  BOOT
// ===========================================================================
async function boot() {
  const fill = document.getElementById("loadfill");
  const txt = document.getElementById("loadtxt");
  txt.textContent = "LOADING FIGHTERS…";
  const sheetEntries = Object.entries(SHEETS);
  const bgEntries = Object.entries(BG_FILES);
  let done = 0; const total = sheetEntries.length + bgEntries.length;
  const bump = () => { done++; fill.style.width = (done / total * 85) + "%"; };
  await Promise.all([
    ...sheetEntries.map(([k, def]) => loadSheet(k, def.file).then(bump)),
    ...bgEntries.map(([k, file]) => loadBG(k, file).then(bump)),
  ]);
  txt.textContent = "LOADING SOUND…";
  // audio is optional / non-blocking
  Promise.all(Object.entries(AUDIO_FILES).map(([n, b]) => loadSound(n, b))).then(() => { fill.style.width = "100%"; });
  fill.style.width = "100%";
  setTimeout(() => { document.getElementById("loading").style.display = "none"; }, 250);
  requestAnimationFrame(frame);
}
boot();
