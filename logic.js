// Citryn Fight Club is a client-only local-multiplayer / vs-CPU game.
// The platform requires a code module at the archive root; this is the
// required no-op stub (all real gameplay runs client-side in game.js).
export const meta = { game: "citryn-fight-club", minPlayers: 1, maxPlayers: 1 };
export function setup() { return {}; }
export function validateAction() { return { ok: true }; }
export function applyAction(state) { return state; }
export function isGameOver() { return { over: false }; }
export function viewFor(state) { return state; }
