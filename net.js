// ===========================================================================
//  CITRYN FIGHT CLUB - client netcode (transport + input relay for lockstep)
// ===========================================================================
// net.js owns the WebSocket connection, room/identity, the lobby handshake, and
// the per-frame input store. It does NOT run the sim - game.js owns the
// fixed-timestep lockstep loop and asks net.js for inputs each frame. V1 is
// delay-based lockstep; the same store also backs rollback in V2.

// ---- input bitmask (8 buttons; held state) --------------------------------
export const BIT = { left: 1, right: 2, up: 4, down: 8, punch: 16, kick: 32, block: 64, special: 128 };

// Pack a held-snapshot {left,right,up,down,punch,kick,block,special} -> byte.
export function packHeld(h) {
  let b = 0;
  if (h.left) b |= BIT.left; if (h.right) b |= BIT.right;
  if (h.up) b |= BIT.up; if (h.down) b |= BIT.down;
  if (h.punch) b |= BIT.punch; if (h.kick) b |= BIT.kick;
  if (h.block) b |= BIT.block; if (h.special) b |= BIT.special;
  return b;
}

// Turn a (cur,prev) bitmask pair into the input object fighterControl expects:
// left/right/down/block are HELD; jump/punch/kick/special are press-EDGES
// (derived deterministically from the bit history, identical on both clients).
export function bitsToInput(cur, prev) {
  const edge = (m) => !!(cur & m) && !(prev & m);
  return {
    left: !!(cur & BIT.left), right: !!(cur & BIT.right),
    down: !!(cur & BIT.down), block: !!(cur & BIT.block),
    jump: edge(BIT.up), punch: edge(BIT.punch), kick: edge(BIT.kick), special: edge(BIT.special),
  };
}

// ---- the connection singleton ---------------------------------------------
export const Net = {
  ws: null,
  room: null,
  playerId: null,
  connected: false,
  wantOpen: false,         // true while we intend to stay connected (drives reconnect)
  status: "offline",       // offline | lobby | running | over
  mySeat: -1,
  seed: 0, epoch: 0, stage: 0,
  p1char: null, p2char: null,
  score: [0, 0],
  lobby: null,             // { players, stage, status, score }
  latency: 0,
  localInputs: new Map(),  // frame -> bits (my seat)
  remoteInputs: new Map(), // frame -> bits (peer seat)
  sendQ: [],               // queued messages until the socket opens
  cbs: {},                 // event callbacks registered by the game
  _pingTimer: null,
  _reconnectTimer: null,

  on(event, fn) { this.cbs[event] = fn; },
  _emit(event, data) { const fn = this.cbs[event]; if (fn) try { fn(data); } catch (e) { console.error(e); } },

  // identity persists per tab so two tabs = two players for testing
  _ensureIdentity() {
    if (this.playerId) return;
    let id = sessionStorage.getItem("cfc-player-id");
    if (!id) { id = "p-" + Math.random().toString(36).slice(2, 10); sessionStorage.setItem("cfc-player-id", id); }
    this.playerId = id;
  },

  // room from ?room=, or generate one and push it into the URL (create match)
  roomFromUrl() { return new URLSearchParams(location.search).get("room"); },
  ensureRoom() {
    let r = this.roomFromUrl();
    if (!r) { r = Math.random().toString(36).slice(2, 7).toUpperCase(); this.setRoom(r); }
    this.room = r; return r;
  },
  setRoom(code) {
    this.room = String(code || "").trim().toUpperCase().slice(0, 12);
    const p = new URLSearchParams(location.search);
    p.set("room", this.room);
    history.replaceState(null, "", location.pathname + "?" + p.toString());
  },
  inviteLink() { return location.href; },
  canShare() { return typeof navigator !== "undefined" && !!navigator.share; },
  // accept a pasted full invite link OR a raw room code
  parseRoomInput(s) {
    s = String(s || "").trim();
    if (!s) return "";
    const m = s.match(/[?&]room=([^&\s]+)/i);
    if (m) return decodeURIComponent(m[1]).toUpperCase().slice(0, 12);
    return s.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12);
  },

  connect() {
    this._ensureIdentity();
    if (!this.room) this.ensureRoom();
    this.wantOpen = true;
    const base = location.pathname.replace(/\/+$/, "");
    const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + base + "/ws/" + this.room;
    try { this.ws = new WebSocket(url); } catch (e) { this._scheduleReconnect(); return; }
    this.ws.onopen = () => {
      this.connected = true;
      this._send({ t: "join", playerId: this.playerId });
      while (this.sendQ.length) this._raw(this.sendQ.shift());
      this._startPing();
      this._emit("conn", { connected: true });
    };
    this.ws.onclose = () => { this.connected = false; this._stopPing(); this._emit("conn", { connected: false }); if (this.wantOpen) this._scheduleReconnect(); };
    this.ws.onerror = () => { try { this.ws.close(); } catch (e) {} };
    this.ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } this._onMessage(m); };
  },
  disconnect() {
    this.wantOpen = false; this._stopPing();
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    try { this.ws && this.ws.close(); } catch (e) {}
    this.ws = null; this.connected = false; this.status = "offline";
    this.localInputs.clear(); this.remoteInputs.clear();
  },
  _scheduleReconnect() {
    if (this._reconnectTimer || !this.wantOpen) return;
    this._reconnectTimer = setTimeout(() => { this._reconnectTimer = null; if (this.wantOpen) this.connect(); }, 1200);
  },

  _raw(obj) { try { this.ws.send(JSON.stringify(obj)); } catch (e) {} },
  _send(obj) { if (this.connected && this.ws && this.ws.readyState === 1) this._raw(obj); else this.sendQ.push(obj); },

  // ---- lobby actions (called by the game UI) ------------------------------
  select(char) { this._send({ t: "select", char }); },
  setStage(stage) { this._send({ t: "select", char: undefined, stage }); },
  ready(v) { this._send({ t: "ready", ready: !!v }); },
  rematch() { this._send({ t: "rematch" }); },

  // ---- per-frame input (lockstep) -----------------------------------------
  submitInput(frame, bits) { this.localInputs.set(frame, bits); this._send({ t: "input", frame, bits, epoch: this.epoch }); },
  // both seats' inputs for `frame` present? returns {p1,p2} bits or null.
  inputsFor(frame) {
    if (!this.localInputs.has(frame) || !this.remoteInputs.has(frame)) return null;
    const mine = this.localInputs.get(frame), peer = this.remoteInputs.get(frame);
    return this.mySeat === 0 ? { p1: mine, p2: peer } : { p1: peer, p2: mine };
  },
  sendChecksum(frame, sum) { this._send({ t: "checksum", frame, sum: sum >>> 0, epoch: this.epoch }); },
  clearInputs() { this.localInputs.clear(); this.remoteInputs.clear(); },
  pruneInputs(before) {
    for (const k of this.localInputs.keys()) if (k < before) this.localInputs.delete(k);
    for (const k of this.remoteInputs.keys()) if (k < before) this.remoteInputs.delete(k);
  },

  // ---- inbound ------------------------------------------------------------
  _onMessage(m) {
    switch (m.t) {
      case "seat":
        this.mySeat = m.seat; this.status = m.status; this.seed = m.seed; this.epoch = m.epoch;
        this.stage = m.stage; this.score = m.score || [0, 0];
        this._emit("seat", m); break;
      case "lobby":
        this.lobby = m; this.status = m.status; this.stage = m.stage; this.score = m.score || this.score;
        this._emit("lobby", m); break;
      case "start":
        this.status = "running"; this.epoch = m.epoch; this.seed = m.seed;
        this.p1char = m.p1char; this.p2char = m.p2char; this.stage = m.stage; this.score = m.score || [0, 0];
        this.clearInputs();
        this._emit("start", m); break;
      case "input":
        if (m.epoch === this.epoch && m.seat !== this.mySeat) this.remoteInputs.set(m.frame, m.bits | 0);
        break;
      case "pong":
        this.latency = Math.max(0, Math.round(performance.now() - m.ts)); break;
      case "desync":
        this._emit("desync", m); break;
      case "peer":
        this._emit("peer", m); break;
      case "forfeit":
        this.status = "over"; this._emit("forfeit", m); break;
      case "error":
        this._emit("error", m); break;
    }
  },

  _startPing() {
    this._stopPing();
    this._pingTimer = setInterval(() => this._send({ t: "ping", ts: performance.now() }), 2000);
  },
  _stopPing() { if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; } },
};
