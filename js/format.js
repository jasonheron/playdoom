export function shortAddr(p) {
  if (!p || p.length < 10) return p || "—";
  return p.slice(0, 6) + "…" + p.slice(-4);
}

export function formatUsdFromWad(wad) {
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
    return "$3";
  }
}

export function formatDoomAmount(wei) {
  try {
    const n = Number(ethers.formatUnits(wei, 18));
    if (!Number.isFinite(n) || n === 0) return "0";
    if (n >= 10) return Math.round(n).toLocaleString("en-US");
    if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  } catch {
    return "—";
  }
}

/** Top-3 split of today's accrued prize: 50 / 30 / 20. Rank 4+ is 0. */
export function prizeShareWei(rankIndex, accruedWei) {
  const bps = [5000n, 3000n, 2000n];
  if (rankIndex < 0 || rankIndex > 2 || accruedWei == null || accruedWei === 0n) return 0n;
  return (accruedWei * bps[rankIndex]) / 10000n;
}

export function doomWeiToUsdWad(doomWei, priceWad) {
  if (!doomWei || !priceWad || doomWei === 0n || priceWad === 0n) return 0n;
  return (doomWei * priceWad) / 1000000000000000000n;
}

/**
 * Prize cell for Season Pit. Never invents amounts.
 * Top 3: USD estimate when oracle price is known, else DOOM amount, else em dash.
 */
export function formatPrizeCell(rankIndex, accruedWei, priceWad) {
  const share = prizeShareWei(rankIndex, accruedWei);
  if (share === 0n) return { primary: "—", suffix: "", known: false };

  const usdWad = doomWeiToUsdWad(share, priceWad);
  if (usdWad > 0n) {
    return { primary: formatUsdFromWad(usdWad), suffix: "$DOOM", known: true };
  }
  return { primary: formatDoomAmount(share), suffix: "$DOOM", known: true };
}
