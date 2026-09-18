import { activeDoomToken, isTestnetMode } from "./config.js";
import { shortAddr } from "./format.js";
import {
  connectWallet,
  disconnectWallet,
  silentRestore,
  watchWallet,
  getConnectedAddress,
} from "./wallet.js";

const $ = (id) => document.getElementById(id);

function formatCountdown(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Seconds until next 19:00 UTC (product epoch).
 * Arena secondsToDayEnd is still midnight until a later contract PR — do not mix that into the chrome timer.
 */
function clientSecondsToUtc1900() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  let end = Date.UTC(y, m, d, 19, 0, 0);
  if (now.getTime() >= end) end = Date.UTC(y, m, d + 1, 19, 0, 0);
  return Math.max(0, Math.floor((end - now.getTime()) / 1000));
}

function currentCountdownSeconds() {
  return clientSecondsToUtc1900();
}

function paintCountdowns() {
  const text = formatCountdown(currentCountdownSeconds());
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    el.textContent = text;
  });
}

const SKULL = `<img class="pixel-skull" src="/assets/icon-about.png?v=10" alt="" width="14" height="14" />`;
const TROPHY = `<img class="icon-trophy" src="/assets/icon-leaderboard.png?v=10" alt="" width="14" height="14" />`;
const DRIP = `<img class="skull-drip" src="/assets/icon-timer.png?v=10" alt="" width="14" height="16" />`;
const WALLET = `<img class="icon-wallet" src="/assets/wallet.svg?v=10" alt="" width="14" height="14" />`;

function paintConnectButton() {
  const btn = $("btnConnect");
  if (!btn) return;
  const addr = getConnectedAddress();
  const on = Boolean(addr);
  btn.classList.toggle("is-connected", on);
  btn.classList.toggle("connect", true);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  const label = btn.querySelector(".connect-label");
  if (label) label.textContent = on ? shortAddr(addr) : "CONNECT WALLET";
  btn.title = on ? addr : "Optional — viewing does not require a wallet";
}

async function onConnectClick() {
  const hint = $("walletHint");
  if (getConnectedAddress()) {
    disconnectWallet();
    paintConnectButton();
    if (hint) hint.textContent = "";
    return;
  }
  try {
    await connectWallet();
    paintConnectButton();
    if (hint) hint.textContent = "";
  } catch (e) {
    paintConnectButton();
    if (hint) {
      hint.textContent =
        e && e.code === "NO_WALLET"
          ? "No wallet detected — viewing doesn’t need one."
          : "Wallet request skipped. You can still watch the pit.";
    }
  }
}

async function copyCa() {
  const full = activeDoomToken();
  try {
    await navigator.clipboard.writeText(full);
    const btn = $("btnCopyCa");
    if (btn) {
        btn.dataset.copied = "1";
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => {
          btn.dataset.copied = "0";
          btn.textContent = prev;
        }, 1400);
    }
  } catch {
    window.prompt(isTestnetMode() ? "Testnet $DOOM CA" : "$DOOM CA", full);
  }
}

/**
 * @param {"play"|"about"|"leaderboard"} active
 */
export function mountNav(active) {
  const root = $("siteNav");
  const header = document.querySelector(".site-header");
  if (header) {
    const lbHref = active === "play" ? "#season-pit" : "/leaderboard";
    const token = activeDoomToken();
    const caTitle = isTestnetMode() ? `${token} — RH testnet mock $DOOM` : `${token} — $DOOM`;
    const caTag = ""; // header mockup has no testnet badge
    header.innerHTML = `
      <a class="brand-panel" href="/" aria-label="$DOOM on PONS">
        <img class="wm-lockup-img" src="/assets/doom-lockup.png?v=10" alt="$DOOM on PONS" width="220" height="78" />
      </a>
      <div class="header-main">
        <div class="header-top">
          <nav class="hud-nav" aria-label="Primary">
            <a href="/about" class="hud-link ${active === "about" ? "active" : ""}">${SKULL}<span>ABOUT</span></a>
            <a href="${lbHref}" class="hud-link ${active === "leaderboard" ? "active" : ""}">${TROPHY}<span>LEADERBOARD</span></a>
          </nav>
          <button type="button" class="hud-connect" id="btnConnect" aria-pressed="false" title="Optional — viewing does not require a wallet">
            ${WALLET}
            <span class="connect-label">CONNECT WALLET</span>
          </button>
        </div>
        <div class="header-bottom">
          <div class="ca-line">
            <span class="ca-k">CA:</span>
            <button type="button" class="ca-addr" id="btnCopyCa" title="${caTitle}">${shortAddr(token)}</button>
          </div>
          <div class="header-count" title="Until 19:00 UTC">
            ${DRIP}
            <span data-countdown>--:--:--</span>
          </div>
        </div>
      </div>
    `;
  } else if (root) {
    root.innerHTML = `
      <a href="/" class="${active === "play" ? "active" : ""}">Play</a>
      <a href="/about" class="${active === "about" ? "active" : ""}">About</a>
      <a href="/leaderboard" class="${active === "leaderboard" ? "active" : ""}">Leaderboard</a>
    `;
  }

  const btn = $("btnConnect");
  if (btn) btn.addEventListener("click", onConnectClick);
  const copy = $("btnCopyCa");
  if (copy) copy.addEventListener("click", copyCa);

  watchWallet();
  silentRestore().then(paintConnectButton);
  window.addEventListener("doom-wallet", paintConnectButton);

  paintCountdowns();
  setInterval(paintCountdowns, 1000);

  if (active === "play") {
    document.querySelectorAll('a[href="#season-pit"]').forEach((a) => {
      a.addEventListener("click", (ev) => {
        const el = document.getElementById("season-pit");
        if (!el) return;
        ev.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }
}

export { formatCountdown, currentCountdownSeconds, paintCountdowns };
