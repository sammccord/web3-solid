import { createEffect, createSignal } from 'solid-js'
import { coinbaseWallet, hooks } from '~/connectors/coinbase'
import { Card } from '../Card'

const { useChainId, useAccounts, useIsActivating, useIsActive, useProvider, useENSNames } = hooks

export default function CoinbaseWalletCard() {
  const chainId = useChainId()
  const accounts = useAccounts()
  const isActivating = useIsActivating()

  const isActive = useIsActive()

  const provider = useProvider()
  const ENSNames = useENSNames(provider)

  const [error, setError] = createSignal(undefined)

  // attempt to connect eagerly on mount
  createEffect(() => {
    void coinbaseWallet.connectEagerly().catch(() => {
      console.debug('Failed to connect eagerly to coinbase wallet')
    })
  })

  return (
    <Card
      connector={coinbaseWallet}
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
