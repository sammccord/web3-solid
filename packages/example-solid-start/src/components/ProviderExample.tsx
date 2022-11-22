import { CoinbaseWallet } from '@web3-solid/coinbase-wallet'
import { useWeb3Solid, Web3SolidHooks, Web3SolidProvider } from '@web3-solid/core'
import { MetaMask } from '@web3-solid/metamask'
import { Network } from '@web3-solid/network'
import { WalletConnect } from '@web3-solid/walletconnect'
import { createEffect } from 'solid-js'
import { coinbaseWallet, hooks as coinbaseWalletHooks } from '~/connectors/coinbase'
import { hooks as metaMaskHooks, metaMask } from '~/connectors/metamask'
import { hooks as walletConnectHooks, walletConnect } from '../connectors/walletConnect'
import { getName } from '../utils'

const connectors: [MetaMask | WalletConnect | CoinbaseWallet | Network, Web3SolidHooks][] = [
  [metaMask, metaMaskHooks],
  [walletConnect, walletConnectHooks],
  [coinbaseWallet, coinbaseWalletHooks],
]

function Child() {
  const { connector, account } = useWeb3Solid()
  createEffect(() => {
    console.log(account())
  })
  console.log(`Priority Connector is: ${getName(connector)}`)
  return <div>{getName(connector)}</div>
}

export default function ProviderExample() {
  return (
    <Web3SolidProvider connectors={connectors}>
      <Child />
    </Web3SolidProvider>
  )
}
