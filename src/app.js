const ARC = {
  chainIdDecimal: 5042002,
  chainIdHex: "0x4cef52",
  chainName: "Arc Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  usdcAddress: "0x3600000000000000000000000000000000000000",
};

const selectors = {
  balanceOf: "0x70a08231",
  transfer: "0xa9059cbb",
};

const state = {
  account: null,
  chainId: null,
  activities: loadActivities(),
};

const elements = {
  connectWallet: document.querySelector("#connectWallet"),
  switchNetwork: document.querySelector("#switchNetwork"),
  transferForm: document.querySelector("#transferForm"),
  walletAddress: document.querySelector("#walletAddress"),
  networkName: document.querySelector("#networkName"),
  nativeBalance: document.querySelector("#nativeBalance"),
  tokenBalance: document.querySelector("#tokenBalance"),
  activityList: document.querySelector("#activityList"),
  copyBrief: document.querySelector("#copyBrief"),
  briefOutput: document.querySelector("#briefOutput"),
  toast: document.querySelector("#toast"),
  walletHelp: document.querySelector("#walletHelp"),
};

renderActivities();
renderBrief();

if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    state.account = accounts[0] || null;
    refresh();
  });

  window.ethereum.on("chainChanged", (chainId) => {
    state.chainId = chainId;
    refresh();
  });
} else {
  elements.walletHelp.hidden = false;
  showToast("No injected wallet found. Install MetaMask, Rabby, Coinbase Wallet, or another EVM wallet.");
}

elements.connectWallet.addEventListener("click", () => runWalletAction(connectWallet));
elements.switchNetwork.addEventListener("click", () => runWalletAction(switchToArc));
elements.transferForm.addEventListener("submit", (event) => runWalletAction(() => sendUsdc(event)));
elements.copyBrief.addEventListener("click", () => runWalletAction(copyBrief));

async function runWalletAction(action) {
  try {
    await action();
  } catch (error) {
    showToast(error.message || "Wallet action failed.");
  }
}

async function connectWallet() {
  assertWallet();
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  state.account = accounts[0] || null;
  state.chainId = await window.ethereum.request({ method: "eth_chainId" });
  await refresh();
}

async function switchToArc() {
  assertWallet();
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC.chainIdHex }],
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw error;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: ARC.chainIdHex,
          chainName: ARC.chainName,
          rpcUrls: [ARC.rpcUrl],
          blockExplorerUrls: [ARC.explorerUrl],
          nativeCurrency: ARC.nativeCurrency,
        },
      ],
    });
  }

  state.chainId = await window.ethereum.request({ method: "eth_chainId" });
  await refresh();
}

async function refresh() {
  elements.walletAddress.textContent = state.account ? shortenAddress(state.account) : "Not connected";
  elements.networkName.textContent = state.chainId === ARC.chainIdHex ? ARC.chainName : state.chainId || "Unknown";

  if (!state.account) {
    elements.nativeBalance.textContent = "--";
    elements.tokenBalance.textContent = "--";
    return;
  }

  if (state.chainId !== ARC.chainIdHex) {
    elements.nativeBalance.textContent = "Switch network";
    elements.tokenBalance.textContent = "Switch network";
    return;
  }

  const [nativeBalance, tokenBalance] = await Promise.all([getNativeBalance(), getUsdcBalance()]);
  elements.nativeBalance.textContent = `${formatUnits(nativeBalance, 18, 6)} USDC`;
  elements.tokenBalance.textContent = `${formatUnits(tokenBalance, 6, 6)} USDC`;
}

async function getNativeBalance() {
  return BigInt(
    await window.ethereum.request({
      method: "eth_getBalance",
      params: [state.account, "latest"],
    }),
  );
}

async function getUsdcBalance() {
  const data = selectors.balanceOf + padAddress(state.account);
  const result = await window.ethereum.request({
    method: "eth_call",
    params: [{ to: ARC.usdcAddress, data }, "latest"],
  });
  return BigInt(result);
}

async function sendUsdc(event) {
  event.preventDefault();
  assertWallet();

  if (!state.account) {
    await connectWallet();
  }

  if (state.chainId !== ARC.chainIdHex) {
    await switchToArc();
  }

  const formData = new FormData(elements.transferForm);
  const recipient = String(formData.get("recipient") || "").trim();
  const amount = String(formData.get("amount") || "").trim();
  const memo = String(formData.get("memo") || "").trim();

  if (!isAddress(recipient)) {
    showToast("Recipient must be a valid EVM address.");
    return;
  }

  const amountUnits = parseUnits(amount, 6);
  if (amountUnits <= 0n) {
    showToast("Amount must be greater than zero.");
    return;
  }

  const data = selectors.transfer + padAddress(recipient) + padUint256(amountUnits);
  const hash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: state.account,
        to: ARC.usdcAddress,
        data,
      },
    ],
  });

  state.activities.unshift({
    hash,
    recipient,
    amount,
    memo,
    createdAt: new Date().toISOString(),
  });
  state.activities = state.activities.slice(0, 8);
  localStorage.setItem("arcpay-pulse-activities", JSON.stringify(state.activities));

  elements.transferForm.reset();
  renderActivities();
  renderBrief();
  await refresh();
  showToast("Transfer submitted to Arc Testnet.");
}

function renderActivities() {
  if (!state.activities.length) {
    elements.activityList.innerHTML = '<p class="empty-state">No transfers yet.</p>';
    return;
  }

  elements.activityList.innerHTML = state.activities
    .map((item) => {
      const explorerLink = `${ARC.explorerUrl}/tx/${item.hash}`;
      const memo = item.memo ? `<span class="activity-meta">Memo: ${escapeHtml(item.memo)}</span>` : "";
      return `
        <article class="activity-item">
          <strong>${escapeHtml(item.amount)} USDC to ${shortenAddress(item.recipient)}</strong>
          ${memo}
          <a href="${explorerLink}" target="_blank" rel="noreferrer">${item.hash}</a>
          <span class="activity-meta">${new Date(item.createdAt).toLocaleString()}</span>
        </article>
      `;
    })
    .join("");
}

function renderBrief() {
  const txLines = state.activities.length
    ? state.activities
        .slice(0, 3)
        .map((item) => `- ${ARC.explorerUrl}/tx/${item.hash}`)
        .join("\n")
    : "- Add transaction links after sending testnet USDC.";

  elements.briefOutput.value = `Title: ArcPay Pulse - Arc Testnet stablecoin payment console

What I built:
ArcPay Pulse is a browser dApp for testing Arc Testnet wallet connection, USDC balance reads, and ERC-20 USDC transfers.

Arc usage:
- Network: Arc Testnet
- Chain ID: ${ARC.chainIdDecimal}
- RPC: ${ARC.rpcUrl}
- USDC contract: ${ARC.usdcAddress}
- Wallet actions: connect, switch/add Arc Testnet, read balances, send testnet USDC

Links:
- Demo: add your deployed URL
- GitHub: add your repository URL
- Explorer transactions:
${txLines}

Why it matters:
The project shows a real stablecoin payment flow on Arc with explorer-verifiable activity and a clean path for users to test payments with faucet USDC.`;
}

async function copyBrief() {
  await navigator.clipboard.writeText(elements.briefOutput.value);
  showToast("Project brief copied.");
}

function loadActivities() {
  try {
    return JSON.parse(localStorage.getItem("arcpay-pulse-activities") || "[]");
  } catch {
    return [];
  }
}

function assertWallet() {
  if (!window.ethereum) {
    elements.walletHelp.hidden = false;
    throw new Error("No EVM wallet detected in this browser. Use MetaMask/Rabby on localhost.");
  }
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function padAddress(address) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

function padUint256(value) {
  return value.toString(16).padStart(64, "0");
}

function parseUnits(value, decimals) {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return 0n;
  }

  const [whole, fraction = ""] = value.split(".");
  const normalizedFraction = fraction.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(whole + normalizedFraction);
}

function formatUnits(value, decimals, precision) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const padded = fraction.toString().padStart(decimals, "0").slice(0, precision);
  const trimmed = padded.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

function shortenAddress(address) {
  if (!address || address.length < 12) {
    return address || "";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 3600);
}
