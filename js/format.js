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
