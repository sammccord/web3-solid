import { createSignal } from 'solid-js'
import { hooks, metaMask } from '~/connectors/metamask'
import { Card } from './ConnectCard'

const { useChainId, useAccounts, useIsActivating, useIsActive, useProvider, useENSNames } = hooks

export default function MetaMaskCard() {
  const chainId = useChainId()
  const accounts = useAccounts()
  const isActivating = useIsActivating()

  const isActive = useIsActive()

  const provider = useProvider()
  const ENSNames = useENSNames(provider)

  const [error, setError] = createSignal(undefined)

  // attempt to connect eagerly on mount
  void metaMask.connectEagerly().catch(() => {
    console.debug('Failed to connect eagerly to metamask')
  })

  return (
    <Card
      connector={metaMask}
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
