/** @type {const} */

/**
 * ─── PONS LAUNCH HOT-SWAP (target: ~5 minutes) ───
 * This file is the only place to paste production CAs.
 * About.html never lists testnet addresses. Do not invent mainnet CAs.
 *
 * 1. Paste MAINNET_DOOM_TOKEN, MAINNET_ARENA, MAINNET_DOOM_ORACLE below
 *    (leave ZERO until PONS actually launches).
 * 2. Set USE_TESTNET = false
 * 3. Commit, push to main, wait for the Vercel production deploy.
 *
 * Play / Season Pit read through activeDoomToken() / activeArena() / resolveReadRpc().
 */

const ZERO = "0x0000000000000000000000000000000000000000";

/** Robinhood Chain mainnet (product later — not default UI). */
export const RH_CHAIN = {
  chainId: 4663,
  chainIdHex: "0x1237",
  name: "Robinhood Chain",
  rpcUrls: [
    "https://rpc.mainnet.chain.robinhood.com",
    "https://rpc.solidrpc.io/public/evm/4663",
  ],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
};

/**
 * Robinhood Chain TESTNET (46630) — default product surface for the public site.
 * PONS has no public testnet → mock $DOOM + mock oracle.
 * chainIdHex MUST be 0xb626 (46630), never 0xb606.
 */
export const RH_TESTNET_CHAIN = {
  chainId: 46630,
  chainIdHex: "0xb626",
  name: "Robinhood Chain Testnet",
  rpcUrls: ["https://rpc.testnet.chain.robinhood.com"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"],
};

/** Public site defaults to RH testnet reads (no wallet required). Flip false at PONS launch. */
export const USE_TESTNET = true;

export const EXPLORER_TESTNET = "https://explorer.testnet.chain.robinhood.com";
export const EXPLORER_MAINNET = "https://robinhoodchain.blockscout.com";

export const TESTNET_DOOM_TOKEN = "0x3464A3d59D09F31E7C105d50B3008C828A6cbe44";
export const TESTNET_DOOM_ORACLE = "0x18C359e5EbD62876c183C75c7e67E4D1Daf48434";
export const TESTNET_ARENA = "0xC86eB423DcAC1d77fA91566B264fE3227d075E2E";

/** Paste real PONS mainnet CAs at launch. Keep ZERO until then. */
export const MAINNET_DOOM_TOKEN = ZERO;
export const MAINNET_DOOM_ORACLE = ZERO;
export const MAINNET_ARENA = ZERO;

/** Local anvil (optional offline) */
export const LOCAL_CHAIN = {
  chainId: 31337,
  chainIdHex: "0x7a69",
  name: "Anvil Local",
  rpcUrls: ["http://127.0.0.1:8545"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockExplorerUrls: [],
};

export function isTestnetMode() {
  return USE_TESTNET === true;
}

export function activeChain() {
  return isTestnetMode() ? RH_TESTNET_CHAIN : RH_CHAIN;
}

export function activeDoomToken() {
  return isTestnetMode() ? TESTNET_DOOM_TOKEN : MAINNET_DOOM_TOKEN;
}

export function activeDoomOracle() {
  return isTestnetMode() ? TESTNET_DOOM_ORACLE : MAINNET_DOOM_ORACLE;
}

export function activeArena() {
  return isTestnetMode() ? TESTNET_ARENA : MAINNET_ARENA;
}

export const DOOM_TOKEN = USE_TESTNET ? TESTNET_DOOM_TOKEN : MAINNET_DOOM_TOKEN;
export const DOOM_ORACLE = USE_TESTNET ? TESTNET_DOOM_ORACLE : MAINNET_DOOM_ORACLE;
export const LOCAL_ARENA = TESTNET_ARENA;
export const LOCAL_SCOREBOARD = ZERO;
export const ARENA_ADDRESS = USE_TESTNET ? TESTNET_ARENA : MAINNET_ARENA;

export const MSFT_TOKEN = "0xe93237C50D904957Cf27E7B1133b510C669c2e74";

export function resolveReadRpc() {
  const chain = activeChain();
  return {
    chain,
    rpcUrl: chain.rpcUrls[0],
    demo: isTestnetMode(),
    testnet: isTestnetMode(),
  };
}

export function explorerAddressUrl(addr) {
  const base = isTestnetMode() ? EXPLORER_TESTNET : EXPLORER_MAINNET;
  return `${base}/address/${addr}`;
}

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const DAILY_ARENA_ABI = [
  "function rankedEntryAmount() view returns (uint256)",
  "function rankedUsdWad() view returns (uint256)",
  "function currentDayId() view returns (uint256)",
  "function secondsToDayEnd() view returns (uint256)",
  "function topDaily(uint256 dayId, uint256 n) view returns (tuple(address player,uint32 kills,uint32 items,uint32 secrets,uint32 level,bytes32 runId,uint64 timestamp,bool ranked)[])",
  "function topDailyToday(uint256 n) view returns (tuple(address player,uint32 kills,uint32 items,uint32 secrets,uint32 level,bytes32 runId,uint64 timestamp,bool ranked)[])",
  "function prizePoolBalance() view returns (uint256)",
  "function dayPrizeAccrued(uint256 dayId) view returns (uint256)",
  "function prizeShareBps() view returns (uint16)",
  "function doomToken() view returns (address)",
  "function doomUsdOracle() view returns (address)",
  "function boardLength(uint256 dayId) view returns (uint256)",
];

export const ORACLE_ABI = [
  "function doomUsdWad() view returns (uint256)",
];
