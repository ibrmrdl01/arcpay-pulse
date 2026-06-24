# ArcPay Pulse

ArcPay Pulse is a small browser dApp for creating real Arc Testnet activity with a wallet. It connects to an injected EVM wallet, switches or adds Arc Testnet, reads the native USDC gas balance, reads the ERC-20 USDC interface balance, and sends testnet USDC transfers.

Repository: `https://github.com/ibrmrdl01/arcpay-pulse`

## Arc Network Details

- Network: Arc Testnet
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- Faucet: `https://faucet.circle.com`
- USDC ERC-20 interface: `0x3600000000000000000000000000000000000000`

Arc uses USDC as the native gas token. The native gas token uses 18 decimals, while the optional USDC ERC-20 interface uses 6 decimals.

## Run Locally

Open `index.html` in a browser with MetaMask, Rabby, Coinbase Wallet, or another injected EVM wallet.

## Test Flow

1. Connect your wallet.
2. Switch to Arc Testnet.
3. Request testnet USDC from the Circle faucet.
4. Send a small USDC transfer.
5. Open the transaction link in ArcScan.
6. Copy the generated project brief and post it to Arc Community.

## Community Submission

Use the generated brief in the app, then add:

- GitHub repository URL
- Live demo URL, if deployed
- ArcScan transaction links
- Screenshots or a short demo video

## Verified Test Transaction

- ArcScan: `https://testnet.arcscan.app/tx/0x9e1da828ca05bd630564a52f6f686500a73c19cb3468b2822e577356a18af2eb`
