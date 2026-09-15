/** Optional injected wallet. Never required to view the site. */

let connected = null;

export function getConnectedAddress() {
  return connected;
}

function emit() {
  window.dispatchEvent(new CustomEvent("doom-wallet", { detail: { address: connected } }));
}

function setConnected(addr) {
  connected = addr ? String(addr) : null;
  emit();
}

export async function silentRestore() {
  const eth = window.ethereum;
  if (!eth || !eth.request) return null;
  try {
    const accounts = await eth.request({ method: "eth_accounts" });
    setConnected(accounts && accounts[0] ? accounts[0] : null);
  } catch {
    setConnected(null);
  }
  return connected;
}

export async function connectWallet() {
  const eth = window.ethereum;
  if (!eth || !eth.request) {
    const err = new Error("No injected wallet");
    err.code = "NO_WALLET";
    throw err;
  }
  const accounts = await eth.request({ method: "eth_requestAccounts" });
  setConnected(accounts && accounts[0] ? accounts[0] : null);
  return connected;
}

export function disconnectWallet() {
  setConnected(null);
}

export function watchWallet() {
  const eth = window.ethereum;
  if (!eth || !eth.on) return;
  eth.on("accountsChanged", (accounts) => {
    setConnected(accounts && accounts[0] ? accounts[0] : null);
  });
}
