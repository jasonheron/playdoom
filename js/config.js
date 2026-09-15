/** @type {const} */

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

/** Public site defaults to RH testnet reads (no wallet required). */
export const USE_TESTNET = true;

export const EXPLORER_TESTNET = "https://explorer.testnet.chain.robinhood.com";

export const TESTNET_DOOM_TOKEN = "0x3464A3d59D09F31E7C105d50B3008C828A6cbe44";
export const TESTNET_DOOM_ORACLE = "0x18C359e5EbD62876c183C75c7e67E4D1Daf48434";
export const TESTNET_ARENA = "0xC86eB423DcAC1d77fA91566B264fE3227d075E2E";

/** Local anvil (optional offline) */
export const LOCAL_CHAIN = {
  chainId: 31337,
  chainIdHex: "0x7a69",
  name: "Anvil Local",
  rpcUrls: ["http://127.0.0.1:8545"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockExplorerUrls: [],
};

export const DOOM_TOKEN = TESTNET_DOOM_TOKEN;
export const DOOM_ORACLE = TESTNET_DOOM_ORACLE;
export const LOCAL_ARENA = TESTNET_ARENA;
export const LOCAL_SCOREBOARD = "0x0000000000000000000000000000000000000000";

export const MSFT_TOKEN = "0xe93237C50D904957Cf27E7B1133b510C669c2e74";

export function isTestnetMode() {
  return USE_TESTNET === true;
}

export const ARENA_ADDRESS = TESTNET_ARENA;

export function activeDoomToken() {
  return TESTNET_DOOM_TOKEN;
}
export function activeDoomOracle() {
  return TESTNET_DOOM_ORACLE;
}

export function resolveReadRpc() {
  return {
    chain: RH_TESTNET_CHAIN,
    rpcUrl: RH_TESTNET_CHAIN.rpcUrls[0],
    demo: true,
    testnet: true,
  };
}

export function explorerAddressUrl(addr) {
  return `${EXPLORER_TESTNET}/address/${addr}`;
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
