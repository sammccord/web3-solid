
import { CoinbaseWallet } from '@web3-solid/coinbase-wallet'
import { MetaMask } from '@web3-solid/metamask'
import { WalletConnect } from '@web3-solid/walletconnect'
import type { Connector } from '@web3-solid/types'

export function getName(connector: Connector) {
  if (connector instanceof MetaMask) return 'MetaMask'
  if (connector instanceof WalletConnect) return 'WalletConnect'
  if (connector instanceof CoinbaseWallet) return 'Coinbase Wallet'
  return 'Unknown'
}
