import type { BigNumber } from '@ethersproject/bignumber'
import { formatEther } from '@ethersproject/units'
import type { Web3SolidHooks } from '@web3-solid/core'
import { useEffect, useState } from 'react'
import { For, Show } from 'solid-js'

function useBalances(
  provider?: ReturnType<Web3SolidHooks['useProvider']>,
  accounts?: string[]
): BigNumber[] | undefined {
  const [balances, setBalances] = useState<BigNumber[] | undefined>()

  useEffect(() => {
    if (provider && accounts?.length) {
      let stale = false

      void Promise.all(accounts.map((account) => provider.getBalance(account))).then((balances) => {
        if (stale) return
        setBalances(balances)
      })

      return () => {
        stale = true
        setBalances(undefined)
      }
    }
  }, [provider, accounts])

  return balances
}

export function Accounts(props: {
  accounts: ReturnType<Web3SolidHooks['useAccounts']>
  provider: ReturnType<Web3SolidHooks['useProvider']>
  ENSNames: ReturnType<Web3SolidHooks['useENSNames']>
}) {
  const balances = useBalances(props.provider, props.accounts)

  if (props.accounts === undefined) return null

  return (
    <div>
      Accounts:{' '}
      <b>
        <Show when={props.accounts.length > 0}>
          <For each={props.accounts}>
            {(account, i) => (
              <ul style={{ margin: 0, overflow: 'hidden', "text-overflow": 'ellipsis' }}>
                {props.ENSNames?.[i()] ?? account}
                {balances?.[i()] ? ` (Ξ${formatEther(balances[i()])})` : null}
              </ul>
            )}
          </For>
        </Show>
      </b>
    </div>
  )
}
