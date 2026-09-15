import {
  TESTNET_ARENA,
  DAILY_ARENA_ABI,
  ORACLE_ABI,
  resolveReadRpc,
  explorerAddressUrl,
} from "./config.js";
import { mountNav } from "./nav.js";

const $ = (id) => document.getElementById(id);

function shortAddr(p) {
  if (!p || p.length < 10) return p || "—";
  return p.slice(0, 6) + "…" + p.slice(-4);
}

function formatDoomWhole(wei) {
  try {
    const n = Number(ethers.formatUnits(wei, 18));
    return Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) + " DOOM";
  } catch {
    return String(wei);
  }
}

function formatUsdFromWad(wad) {
  try {
    const n = Number(ethers.formatEther(wad));
    if (!Number.isFinite(n) || n === 0) return "$0";
    let s;
    if (n >= 1) s = n.toFixed(2);
    else if (n >= 0.01) s = n.toFixed(4);
    else s = n.toFixed(10);
    s = s.replace(/\.?0+$/, "");
    return "$" + s;
  } catch {
    return "—";
  }
}

async function getArena() {
  const { rpcUrl, chain } = resolveReadRpc();
  const provider = new ethers.JsonRpcProvider(rpcUrl, chain.chainId);
  return new ethers.Contract(TESTNET_ARENA, DAILY_ARENA_ABI, provider);
}

async function refresh() {
  const tbody = $("lbBody");
  const status = $("lbStatus");
  try {
    const arena = await getArena();
    const { rpcUrl, chain } = resolveReadRpc();
    const provider = new ethers.JsonRpcProvider(rpcUrl, chain.chainId);

    const dayId = await arena.currentDayId();
    const rows = await arena.topDaily(dayId, 25);
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

    if ($("dayIdHint")) $("dayIdHint").textContent = String(dayId);
    if ($("poolBal")) $("poolBal").textContent = formatDoomWhole(pool);
    if ($("dayPrize")) $("dayPrize").textContent = formatDoomWhole(accrued);
    const usdShort = formatUsdFromWad(usdWad);
    if ($("feeUsd")) $("feeUsd").textContent = usdShort + " of $DOOM";
    if ($("feeTokens")) $("feeTokens").textContent = formatDoomWhole(fee) + " (=" + usdShort + ")";
    if ($("oraclePrice")) $("oraclePrice").textContent = formatUsdFromWad(priceWad) + " / DOOM";

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="3">No ranked scores yet today</td></tr>`;
    } else {
      tbody.innerHTML = rows
        .map((s, i) => {
          const href = explorerAddressUrl(s.player);
          return `<tr>
            <td>${i + 1}</td>
            <td class="addr"><a href="${href}" target="_blank" rel="noopener" title="${s.player}">${shortAddr(s.player)}</a></td>
            <td>${s.kills}</td>
          </tr>`;
        })
        .join("");
    }
    if (status) {
      status.textContent = `Live from RH testnet · ${rows.length} wallet${rows.length === 1 ? "" : "s"} · no wallet needed`;
      status.className = "status ok";
    }
  } catch (e) {
    console.error(e);
    if (tbody) tbody.innerHTML = `<tr><td colspan="3">${e.shortMessage || e.message}</td></tr>`;
    if (status) {
      status.textContent = e.shortMessage || e.message || String(e);
      status.className = "status err";
    }
  }
}

mountNav("leaderboard");
refresh();
setInterval(refresh, 20000);
