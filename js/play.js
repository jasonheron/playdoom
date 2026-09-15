import { mountNav } from "./nav.js";
import { formatUsdFromWad } from "./format.js";
import { TESTNET_ARENA, DAILY_ARENA_ABI, resolveReadRpc } from "./config.js";
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
    const arena = new ethers.Contract(TESTNET_ARENA, DAILY_ARENA_ABI, provider);
    const usd = await arena.rankedUsdWad();
    const rankedTxt = `Ranked = ${formatUsdFromWad(usd)} of $DOOM · wallet-based UTC day. Connect is optional to view.`;
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

paintFeeNote();
refreshPit({ limit: 10 });
setInterval(() => refreshPit({ limit: 10 }), 20000);

if (location.hash === "#season-pit") {
  requestAnimationFrame(() => {
    document.getElementById("season-pit")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
