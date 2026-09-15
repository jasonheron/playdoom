import { RH_TESTNET_CHAIN, DAILY_ARENA_ABI, TESTNET_ARENA, resolveReadRpc } from "./config.js";

const $ = (id) => document.getElementById(id);

function formatCountdown(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Seconds until next UTC midnight (client clock fallback). */
function clientSecondsToUtcDayEnd() {
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.max(0, Math.floor((end - now.getTime()) / 1000));
}

let cachedChainSeconds = null;
let cachedAtMs = 0;

async function fetchChainSecondsToDayEnd() {
  try {
    const addr = TESTNET_ARENA;
    if (!addr || addr === "0x0000000000000000000000000000000000000000") return null;
    const { rpcUrl } = resolveReadRpc(addr);
    const provider = new ethers.JsonRpcProvider(rpcUrl, RH_TESTNET_CHAIN.chainId);
    const arena = new ethers.Contract(addr, DAILY_ARENA_ABI, provider);
    const secs = await arena.secondsToDayEnd();
    return Number(secs);
  } catch {
    return null;
  }
}

async function refreshCountdownSources() {
  const chain = await fetchChainSecondsToDayEnd();
  if (chain != null && Number.isFinite(chain)) {
    cachedChainSeconds = chain;
    cachedAtMs = Date.now();
  }
}

function currentCountdownSeconds() {
  if (cachedChainSeconds != null) {
    const elapsed = Math.floor((Date.now() - cachedAtMs) / 1000);
    return Math.max(0, cachedChainSeconds - elapsed);
  }
  return clientSecondsToUtcDayEnd();
}

function paintCountdowns() {
  const text = formatCountdown(currentCountdownSeconds());
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    el.textContent = text;
  });
}

/**
 * @param {"play"|"how"|"leaderboard"} active
 */
export function mountNav(active) {
  const root = $("siteNav");
  if (!root) return;
  root.innerHTML = `
    <a href="index.html" class="${active === "play" ? "active" : ""}">Play</a>
    <a href="how.html" class="${active === "how" ? "active" : ""}">How it works</a>
    <a href="leaderboard.html" class="lb-link ${active === "leaderboard" ? "active" : ""}">
      Leaderboard
      <span class="countdown" data-countdown title="UTC day ends">--:--:--</span>
    </a>
  `;
  paintCountdowns();
  refreshCountdownSources().then(paintCountdowns);
  setInterval(paintCountdowns, 1000);
  setInterval(() => refreshCountdownSources(), 30000);
}

export { formatCountdown, currentCountdownSeconds, refreshCountdownSources, paintCountdowns };
