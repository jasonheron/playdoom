import { mountNav } from "./nav.js";
import { formatUsdFromWad } from "./format.js";
import { TESTNET_ARENA, DAILY_ARENA_ABI, resolveReadRpc } from "./config.js";

mountNav("play");

async function paintFeeNote() {
  const el = document.getElementById("feeNote");
  if (!el) return;
  try {
    const { rpcUrl, chain } = resolveReadRpc();
    const provider = new ethers.JsonRpcProvider(rpcUrl, chain.chainId);
    const arena = new ethers.Contract(TESTNET_ARENA, DAILY_ARENA_ABI, provider);
    const usd = await arena.rankedUsdWad();
    el.textContent = `Freeplay is free · Ranked = ${formatUsdFromWad(usd)} of $DOOM (PONS token, live price)`;
  } catch {
    el.textContent = "Freeplay is free · Ranked = $X of $DOOM (see How it works)";
  }
}

paintFeeNote();
