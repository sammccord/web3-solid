import type { Web3SolidHooks } from '@web3-solid/core'
import { CHAINS } from '~/chains'

export function Chain(props: { chainId: ReturnType<Web3SolidHooks['useChainId']> }) {
  if (props.chainId === undefined) return null

  const name = props.chainId ? CHAINS[props.chainId]?.name : undefined

  if (name) {
    return (
      <div>
        Chain:{' '}
        <b>
          {name} ({props.chainId})
        </b>
      </div>
    )
  }

  return (
    <div>
      Chain Id: <b>{props.chainId}</b>
    </div>
  )
}
