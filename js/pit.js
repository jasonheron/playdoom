import {
  TESTNET_ARENA,
  DAILY_ARENA_ABI,
  ORACLE_ABI,
  resolveReadRpc,
  explorerAddressUrl,
} from "./config.js";
import { shortAddr, formatPrizeCell, formatUsdFromWad, formatDoomAmount } from "./format.js";
import { getConnectedAddress } from "./wallet.js";

const $ = (id) => document.getElementById(id);

const SKULL = `<img class="pixel-skull" src="assets/pixel-skull.svg" alt="" width="18" height="18" />`;
const DRIP = `<img class="skull-drip" src="assets/skull-drip.svg" alt="" width="14" height="16" />`;

function isYou(player) {
  const me = getConnectedAddress();
  if (!me || !player) return false;
  return me.toLowerCase() === String(player).toLowerCase();
}

export function renderPitRows(listEl, { rows, accruedWei, priceWad }) {
  if (!listEl) return;
  if (!rows || !rows.length) {
    listEl.innerHTML = `<li class="pit-empty">No ranked scores yet today</li>`;
    return;
  }
  listEl.innerHTML = rows
    .map((s, i) => {
      const you = isYou(s.player);
      const href = explorerAddressUrl(s.player);
      const name = you ? "YOU" : shortAddr(s.player);
      const prize = formatPrizeCell(i, accruedWei, priceWad);
      const prizeHtml = prize.known
        ? `<span class="prize-usd">${prize.primary}</span><span class="prize-tok">${prize.suffix}</span>`
        : `<span class="prize-none">—</span>`;
      return `<li class="pit-row${you ? " you" : ""}">
        <span class="pit-rank">${i + 1}</span>
        ${SKULL}
        <a class="pit-name" href="${href}" target="_blank" rel="noopener" title="${s.player}">${name}</a>
        <span class="pit-kills">${DRIP}<span>${s.kills}</span></span>
        <span class="pit-prize">${prizeHtml}</span>
      </li>`;
    })
    .join("");
}

export function pitMarkup() {
  return `
    <div class="pit-frame">
      <section class="pit" id="season-pit">
        <h2 class="pit-title">SEASON PIT</h2>
        <div class="pit-timer">
          ${DRIP}
          <span class="pit-count" data-countdown title="UTC day ends">--:--:--</span>
        </div>
        <ol class="pit-list" id="pitList">
          <li class="pit-empty">Loading ranked wallets…</li>
        </ol>
        <p class="pit-status" id="pitStatus"></p>
      </section>
    </div>`;
}

let cached = { rows: [], accruedWei: 0n, priceWad: 0n };

export function paintCachedPit() {
  renderPitRows($("pitList"), cached);
}

async function getArena() {
  const { rpcUrl, chain } = resolveReadRpc();
  const provider = new ethers.JsonRpcProvider(rpcUrl, chain.chainId);
  return { arena: new ethers.Contract(TESTNET_ARENA, DAILY_ARENA_ABI, provider), provider };
}

export async function refreshPit({ limit = 10 } = {}) {
  const tbody = $("pitList");
  const status = $("pitStatus");
  try {
    const { arena, provider } = await getArena();
    const dayId = await arena.currentDayId();
    const rows = await arena.topDaily(dayId, limit);
    const fee = await arena.rankedEntryAmount();
    const usdWad = await arena.rankedUsdWad();
    const pool = await arena.prizePoolBalance();
    const accrued = await arena.dayPrizeAccrued(dayId);
    const oracleAddr = await arena.doomUsdOracle();
    let priceWad = 0n;
    try {
      const oracle = new ethers.Contract(oracleAddr, ORACLE_ABI, provider);
      priceWad = await oracle.doomUsdWad();
    } catch {
      /* ignore */
    }

    cached = { rows, accruedWei: accrued, priceWad };
    paintCachedPit();

    if ($("dayIdHint")) $("dayIdHint").textContent = String(dayId);
    if ($("poolBal")) $("poolBal").textContent = formatDoomAmount(pool) + " $DOOM";
    if ($("dayPrize")) $("dayPrize").textContent = formatDoomAmount(accrued) + " $DOOM";
    const usdShort = formatUsdFromWad(usdWad);
    if ($("feeUsd")) $("feeUsd").textContent = usdShort + " of $DOOM";
    if ($("feeTokens")) $("feeTokens").textContent = formatDoomAmount(fee) + " $DOOM (=" + usdShort + ")";
    if ($("oraclePrice")) $("oraclePrice").textContent = formatUsdFromWad(priceWad) + " / $DOOM";

    if (status) {
      status.textContent = `Live RH testnet · ${rows.length} wallet${rows.length === 1 ? "" : "s"} · no wallet needed`;
      status.className = "pit-status ok";
    }
    return { usdWad, rows };
  } catch (e) {
    console.error(e);
    if (tbody) {
      tbody.innerHTML = `<li class="pit-empty err">${e.shortMessage || e.message || String(e)}</li>`;
    }
    if (status) {
      status.textContent = e.shortMessage || e.message || String(e);
      status.className = "pit-status err";
    }
    return null;
  }
}

export function bindPitWalletRepaint() {
  window.addEventListener("doom-wallet", paintCachedPit);
}
