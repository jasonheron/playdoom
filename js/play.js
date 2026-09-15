import { mountNav } from "./nav.js";
import { formatUsdFromWad } from "./format.js";
import { activeArena, DAILY_ARENA_ABI, resolveReadRpc } from "./config.js";
import { refreshPit, bindPitWalletRepaint } from "./pit.js";
import { getConnectedAddress } from "./wallet.js";

mountNav("play");
bindPitWalletRepaint();

const MODE_KEY = "doom-play-mode";

function $(id) {
  return document.getElementById(id);
}

function setMode(mode) {
  const free = $("btnFree");
  const ranked = $("btnRanked");
  const note = $("feeNote");
  const isRanked = mode === "ranked";
  if (free) {
    free.classList.toggle("selected", !isRanked);
    free.setAttribute("aria-pressed", String(!isRanked));
  }
  if (ranked) {
    ranked.classList.toggle("selected", isRanked);
    ranked.setAttribute("aria-pressed", String(isRanked));
  }
  try {
    sessionStorage.setItem(MODE_KEY, isRanked ? "ranked" : "free");
  } catch {
    /* ignore */
  }
  document.body.classList.toggle("mode-ranked", isRanked);
  if (note && note.dataset.base) {
    note.textContent = isRanked
      ? note.dataset.ranked || note.dataset.base
      : note.dataset.free || note.dataset.base;
  }
}

async function paintFeeNote() {
  const el = $("feeNote");
  if (!el) return;
  const freeTxt = "Free Play is free · does not enter today’s prize board.";
  el.dataset.free = freeTxt;
  el.dataset.base = freeTxt;
  try {
    const { rpcUrl, chain } = resolveReadRpc();
    const provider = new ethers.JsonRpcProvider(rpcUrl, chain.chainId);
    const arena = new ethers.Contract(activeArena(), DAILY_ARENA_ABI, provider);
    const usd = await arena.rankedUsdWad();
    const rankedTxt = `Ranked = ${formatUsdFromWad(usd)} of $DOOM · wallet-based day · rolls 19:00 UTC. Connect is optional to view.`;
    el.dataset.ranked = rankedTxt;
    el.dataset.base = `Free Play is free · Ranked = ${formatUsdFromWad(usd)} of $DOOM`;
  } catch {
    el.dataset.ranked = "Ranked = owner-set USD of $DOOM (default $3). Connect is optional to view.";
    el.dataset.base = "Free Play is free · Ranked = $X of $DOOM";
  }
  const saved = (() => {
    try {
      return sessionStorage.getItem(MODE_KEY);
    } catch {
      return null;
    }
  })();
  setMode(saved === "ranked" ? "ranked" : "free");
}

function onRankedClick() {
  setMode("ranked");
  if (!getConnectedAddress()) {
    const hint = $("walletHint");
    if (hint) {
      hint.textContent =
        "Ranked uses your wallet as identity. Viewing the pit does not require connecting.";
    }
    const btn = $("btnConnect");
    if (btn) {
      btn.classList.add("nudge");
      setTimeout(() => btn.classList.remove("nudge"), 1200);
    }
  }
}

const free = $("btnFree");
const ranked = $("btnRanked");
if (free) free.addEventListener("click", () => setMode("free"));
if (ranked) ranked.addEventListener("click", onRankedClick);

function paintRunHud(msg) {
  const hud = $("runHud");
  const note = $("runNote");
  const set = (id, val) => {
    const el = $(id);
    if (el) el.textContent = val == null || val === "" ? "—" : String(val);
  };
  if (msg.type === "doom-run-ready") {
    if (hud) hud.dataset.hook = "waiting";
    if (note) note.textContent = "E1M1 Hurt Me Plenty — waiting for live HEAP stats…";
    return;
  }
  if (msg.type === "doom-run-stats") {
    if (hud) hud.dataset.hook = "live";
    set("hudKills", msg.kills);
    set("hudItems", msg.items);
    set("hudSecrets", msg.secrets);
    if (note) {
      note.textContent =
        "Live from Chocolate Doom HEAP (killcount/itemcount/secretcount) · not invented";
    }
    return;
  }
  if (msg.type === "doom-run-result") {
    if (hud) hud.dataset.hook = msg.ended || "ended";
    set("hudKills", msg.kills);
    set("hudItems", msg.items);
    set("hudSecrets", msg.secrets);
    if (note) {
      const end =
        msg.ended === "completed" ? "E1M1 cleared" : msg.ended === "dead" ? "You died" : "Run ended";
      note.textContent = `${end} · KILLS ${msg.kills} · posted ${msg.runId || ""}`.trim();
    }
  }
}

window.addEventListener("message", (ev) => {
  const msg = ev.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "doom-touch-ui") {
    document.querySelector(".game-stage")?.classList.toggle("touch-ui", !!msg.on);
    return;
  }
  if (msg.type === "doom-run-ready" || msg.type === "doom-run-stats" || msg.type === "doom-run-result") {
    paintRunHud(msg);
  }
});

const stage = document.querySelector(".game-stage");
const frame = $("doomFrame");
if (stage && frame) {
  stage.addEventListener("pointerdown", () => {
    try {
      frame.contentWindow && frame.contentWindow.focus();
    } catch {
      /* ignore */
    }
  });
}

paintFeeNote();
refreshPit({ limit: 10 });
setInterval(() => refreshPit({ limit: 10 }), 20000);

if (location.hash === "#season-pit") {
  requestAnimationFrame(() => {
    document.getElementById("season-pit")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
