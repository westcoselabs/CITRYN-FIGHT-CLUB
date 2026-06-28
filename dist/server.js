// ===========================================================================
//  CITRYN FIGHT CLUB - online multiplayer server (Higgsfield Tier-2 real-time)
// ===========================================================================
// The Durable Object is a lightweight match COORDINATOR + input RELAY. It does
// NOT simulate the fight: both clients run the identical deterministic sim and
// the DO keeps them in lockstep by (a) seating players, (b) sharing the RNG
// seed + start tick, and (c) forwarding each player's per-frame input to the
// other. One DO instance = one room. The engine routes ws(s)://<host><base>/ws/<roomId>
// to this class's fetch(). In-memory state only (resets on restart) - clients
// auto-reconnect and the match resyncs from a clean round.
import { DurableObject } from "cloudflare:workers";

const MAX_SEATS = 2;
const RECONNECT_GRACE_MS = 12000;

export class GameServer extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.clients = new Map();      // ws -> { id, playerId, seat, char, ready, ws }
    this.seats = [null, null];     // playerId occupying each seat (null = open)
    this.status = "lobby";         // lobby | running | over
    this.stage = 0;
    this.seed = 0;
    this.epoch = 0;                // increments per (re)start; tags inputs to a match
    this.score = [0, 0];          // round wins per seat (authoritative scoreboard)
    this.checks = [{}, {}];        // seat -> { frame: checksum } for desync detection
    this.disconnectedSeat = -1;    // a seat awaiting reconnect within grace
    this.graceAt = 0;              // Date.now() deadline for the grace window
  }

  // ---- transport -----------------------------------------------------------
  async fetch(request) {
    if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
      return new Response("Citryn Fight Club online server", { status: 200 });
    }
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    server.accept();
    const rec = { id: crypto.randomUUID(), playerId: null, seat: -1, char: null, ready: false, ws: server };
    this.clients.set(server, rec);
    server.addEventListener("message", (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      try { this.onMessage(rec, msg); } catch (e) { this.send(rec, { t: "error", msg: String(e && e.message || e) }); }
    });
    const drop = () => this.onClose(rec);
    server.addEventListener("close", drop);
    server.addEventListener("error", drop);
    return new Response(null, { status: 101, webSocket: client });
  }

  send(rec, obj) { try { rec.ws.send(JSON.stringify(obj)); } catch (e) {} }
  broadcast(obj, exceptRec) { for (const rec of this.clients.values()) if (rec !== exceptRec) this.send(rec, obj); }
  seatRec(seat) { for (const rec of this.clients.values()) if (rec.seat === seat) return rec; return null; }

  // ---- message router ------------------------------------------------------
  onMessage(rec, msg) {
    switch (msg.t) {
      case "join":    return this.onJoin(rec, msg);
      case "select":  return this.onSelect(rec, msg);
      case "ready":   return this.onReady(rec, msg);
      case "input":   return this.onInput(rec, msg);
      case "checksum":return this.onChecksum(rec, msg);
      case "ping":    return this.send(rec, { t: "pong", ts: msg.ts });
      case "rematch": return this.onRematch(rec, msg);
      default:        return this.send(rec, { t: "error", msg: "unknown message " + msg.t });
    }
  }

  onJoin(rec, msg) {
    const playerId = String(msg.playerId || "").slice(0, 64);
    if (!playerId) return this.send(rec, { t: "error", msg: "playerId required" });
    rec.playerId = playerId;

    // reclaim an existing seat (reconnect), else take an open seat, else spectate
    let seat = this.seats.indexOf(playerId);
    if (seat === -1) {
      const open = this.seats.indexOf(null);
      if (open !== -1 && this.status !== "running") { seat = open; this.seats[open] = playerId; }
    }
    rec.seat = seat;

    // reconnect during a live match within the grace window -> resync the round
    if (seat !== -1 && seat === this.disconnectedSeat) {
      this.disconnectedSeat = -1; this.graceAt = 0;
      this.send(rec, this.seatMsg(rec));
      if (this.status === "running") { this.startMatch(true); return; }
    }

    this.send(rec, this.seatMsg(rec));
    this.broadcastLobby();
  }

  onSelect(rec, msg) {
    if (rec.seat === -1) return;
    if (typeof msg.char === "string") rec.char = msg.char;
    if (Number.isInteger(msg.stage)) this.stage = msg.stage;   // either seat may set the stage; last write wins
    rec.ready = false;                                          // changing a pick clears ready
    this.broadcastLobby();
  }

  onReady(rec, msg) {
    if (rec.seat === -1) return;
    rec.ready = !!msg.ready && !!rec.char;
    this.broadcastLobby();
    if (this.bothReady()) this.startMatch(false);
  }

  onInput(rec, msg) {
    if (rec.seat === -1 || this.status !== "running") return;
    if (msg.epoch !== this.epoch) return;                       // stale input from a previous match
    if (!Number.isInteger(msg.frame)) return;
    // relay this player's input to everyone else (peer + spectators)
    this.broadcast({ t: "input", seat: rec.seat, frame: msg.frame, bits: msg.bits | 0, epoch: this.epoch }, rec);
  }

  onChecksum(rec, msg) {
    if (rec.seat === -1 || this.status !== "running" || msg.epoch !== this.epoch) return;
    this.checks[rec.seat][msg.frame] = msg.sum >>> 0;
    const other = this.checks[1 - rec.seat][msg.frame];
    if (other !== undefined) {
      if (other !== (msg.sum >>> 0)) this.broadcast({ t: "desync", frame: msg.frame });
      delete this.checks[0][msg.frame]; delete this.checks[1][msg.frame];
    }
  }

  onRematch(rec, msg) {
    if (rec.seat === -1) return;
    rec.ready = false;
    if (this.status === "over") { this.status = "lobby"; this.score = [0, 0]; }
    this.broadcastLobby();
  }

  // ---- match lifecycle -----------------------------------------------------
  bothReady() {
    const r0 = this.seatRec(0), r1 = this.seatRec(1);
    return r0 && r1 && r0.ready && r1.ready && r0.char && r1.char;
  }
  startMatch(resync) {
    const r0 = this.seatRec(0), r1 = this.seatRec(1);
    if (!r0 || !r1) return;
    this.status = "running";
    this.epoch++;
    if (!resync) { this.seed = (Math.random() * 0x7fffffff) | 0 || 1; this.score = [0, 0]; }
    this.checks = [{}, {}];
    this.broadcast({
      t: "start", epoch: this.epoch, seed: this.seed, startTick: 0,
      p1char: r0.char, p2char: r1.char, stage: this.stage, score: this.score.slice(),
    });
  }

  // ---- presence ------------------------------------------------------------
  onClose(rec) {
    if (!this.clients.has(rec.ws)) return;
    this.clients.delete(rec.ws);
    if (rec.seat !== -1 && this.status === "running") {
      // hold the seat open for a reconnect; tell the opponent
      this.disconnectedSeat = rec.seat;
      this.graceAt = Date.now() + RECONNECT_GRACE_MS;
      this.broadcast({ t: "peer", event: "left", seat: rec.seat, graceMs: RECONNECT_GRACE_MS });
      this.scheduleGrace();
    } else if (rec.seat !== -1) {
      this.broadcast({ t: "peer", event: "left", seat: rec.seat });
    }
    this.broadcastLobby();
  }

  scheduleGrace() {
    if (this._graceHandle) return;
    const tick = () => {
      this._graceHandle = null;
      if (this.disconnectedSeat === -1) return;
      if (Date.now() >= this.graceAt) {
        // grace expired -> remaining player wins the match
        const winner = 1 - this.disconnectedSeat;
        this.disconnectedSeat = -1;
        this.status = "over";
        this.broadcast({ t: "forfeit", winner });
      } else {
        this._graceHandle = setTimeout(tick, 500);
      }
    };
    this._graceHandle = setTimeout(tick, 500);
  }

  // ---- views ---------------------------------------------------------------
  seatMsg(rec) {
    return { t: "seat", you: rec.playerId, seat: rec.seat, max: MAX_SEATS, status: this.status,
             seed: this.seed, epoch: this.epoch, stage: this.stage, score: this.score.slice() };
  }
  lobbyView() {
    const players = [0, 1].map((s) => {
      const r = this.seatRec(s);
      return r ? { seat: s, char: r.char, ready: r.ready, connected: true }
               : { seat: s, char: null, ready: false, connected: this.seats[s] != null };
    });
    return { t: "lobby", players, stage: this.stage, status: this.status, score: this.score.slice() };
  }
  broadcastLobby() { this.broadcast(this.lobbyView()); }
}
