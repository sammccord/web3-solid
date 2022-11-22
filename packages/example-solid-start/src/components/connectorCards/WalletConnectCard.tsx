import { URI_AVAILABLE } from '@web3-solid/walletconnect'
import { createEffect, createSignal } from 'solid-js'
import { hooks, walletConnect } from '~/connectors/walletConnect'
import { Card } from '../Card'

const { useChainId, useAccounts, useIsActivating, useIsActive, useProvider, useENSNames } = hooks

export default function WalletConnectCard() {
  const chainId = useChainId()
  const accounts = useAccounts()
  const isActivating = useIsActivating()

  const isActive = useIsActive()

  const provider = useProvider()
  const ENSNames = useENSNames(provider)

  const [error, setError] = createSignal(undefined)

  // log URI when available
  createEffect(() => {
    walletConnect.events.on(URI_AVAILABLE, (uri: string) => {
      console.log(`uri: ${uri}`)
    })
  })

  // attempt to connect eagerly on mount
  createEffect(() => {
    walletConnect.connectEagerly().catch(() => {
      console.debug('Failed to connect eagerly to walletconnect')
    })
  })

  return (
    <Card
      connector={walletConnect}
      chainId={chainId}
      isActivating={isActivating}
      isActive={isActive}
      error={error()}
      setError={setError}
      accounts={accounts}
      provider={provider}
      ENSNames={ENSNames}
    />
  )
}
