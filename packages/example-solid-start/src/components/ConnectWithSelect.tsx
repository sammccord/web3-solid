import type { CoinbaseWallet } from '@web3-solid/coinbase-wallet'
import type { Web3SolidHooks } from '@web3-solid/core'
import type { MetaMask } from '@web3-solid/metamask'
import { WalletConnect } from '@web3-solid/walletconnect'
import { GnosisSafe } from '@web3-solid/gnosis-safe'
import { Network } from '@web3-solid/network'
import { useCallback, useState } from 'react'
import { CHAINS, getAddChainParameters, URLS } from '~/lib/chains'

function ChainSelect(props: {
  chainId: number
  switchChain: (chainId: number) => void | undefined
  displayDefault: boolean
  chainIds: number[]
}) {
  return (
    <select
      value={props.chainId}
      onChange={(event) => {
        props.switchChain?.(Number(event.target.value))
      }}
      disabled={props.switchChain === undefined}
    >
      {props.displayDefault ? <option value={-1}>Default Chain</option> : null}
      {props.chainIds.map((chainId) => (
        <option key={chainId} value={chainId}>
          {CHAINS[chainId]?.name ?? chainId}
        </option>
      ))}
    </select>
  )
}

export function ConnectWithSelect(props: {
  connector: MetaMask | WalletConnect | CoinbaseWallet | Network | GnosisSafe
  chainId: ReturnType<Web3SolidHooks['useChainId']>
  isActivating: ReturnType<Web3SolidHooks['useIsActivating']>
  isActive: ReturnType<Web3SolidHooks['useIsActive']>
  error: Error | undefined
  setError: (error: Error | undefined) => void
}) {
  const isNetwork = props.connector instanceof Network
  const displayDefault = !isNetwork
  const chainIds = (isNetwork ? Object.keys(URLS) : Object.keys(CHAINS)).map((chainId) => Number(chainId))

  const [desiredChainId, setDesiredChainId] = useState<number>(isNetwork ? 1 : -1)

  const switchChain = useCallback(
    (desiredChainId: number) => {
      setDesiredChainId(desiredChainId)
      // if we're already connected to the desired chain, return
      if (desiredChainId === props.chainId) {
        props.setError(undefined)
        return
      }

      // if they want to connect to the default chain and we're already connected, return
      if (desiredChainId === -1 && props.chainId !== undefined) {
        props.setError(undefined)
        return
      }

      if (props.connector instanceof WalletConnect || props.connector instanceof Network) {
        props.connector
          .activate(desiredChainId === -1 ? undefined : desiredChainId)
          .then(() => props.setError(undefined))
          .catch(props.setError)
      } else {
        props.connector
          .activate(desiredChainId === -1 ? undefined : getAddChainParameters(desiredChainId))
          .then(() => props.setError(undefined))
          .catch(props.setError)
      }
    }
  )

  const onClick = useCallback((): void => {
    props.setError(undefined)
    if (props.connector instanceof GnosisSafe) {
      props.connector
        .activate()
        .then(() => props.setError(undefined))
        .catch(props.setError)
    } else if (props.connector instanceof WalletConnect || props.connector instanceof Network) {
      props.connector
        .activate(desiredChainId === -1 ? undefined : desiredChainId)
        .then(() => props.setError(undefined))
        .catch(props.setError)
    } else {
      props.connector
        .activate(desiredChainId === -1 ? undefined : getAddChainParameters(desiredChainId))
        .then(() => props.setError(undefined))
        .catch(props.setError)
    }
  })

  if (props.error) {
    return (
      <div style={{ display: 'flex', "flex-direction": 'column' }}>
        {!(props.connector instanceof GnosisSafe) && (
          <ChainSelect
            chainId={desiredChainId}
            switchChain={switchChain}
            displayDefault={displayDefault}
            chainIds={chainIds}
          />
        )}
        <div style={{ "margin-bottom": '1rem' }} />
        <button onClick={onClick}>Try Again?</button>
      </div>
    )
  } else if (props.isActive) {
    return (
      <div style={{ display: 'flex', "flex-direction": 'column' }}>
        {!(props.connector instanceof GnosisSafe) && (
          <ChainSelect
            chainId={desiredChainId === -1 ? -1 : props.chainId}
            switchChain={switchChain}
            displayDefault={displayDefault}
            chainIds={chainIds}
          />
        )}
        <div style={{ "margin-bottom": '1rem' }} />
        <button
          onClick={() => {
            if (props.connector?.deactivate) {
              void props.connector.deactivate()
            } else {
              void props.connector.resetState()
            }
          }}
        >
          Disconnect
        </button>
      </div>
    )
  } else {
    return (
      <div style={{ display: 'flex', "flex-direction": 'column' }}>
        {!(props.connector instanceof GnosisSafe) && (
          <ChainSelect
            chainId={desiredChainId}
            switchChain={props.isActivating ? undefined : switchChain}
            displayDefault={displayDefault}
            chainIds={chainIds}
          />
        )}
        <div style={{ "margin-bottom": '1rem' }} />
        <button
          onClick={
            props.isActivating
              ? undefined
              : () =>
              props.connector instanceof GnosisSafe
                    ? void props.connector
                        .activate()
                        .then(() => props.setError(undefined))
                        .catch(props.setError)
                    : props.connector instanceof WalletConnect || props.connector instanceof Network
                    ? props.connector
                        .activate(desiredChainId === -1 ? undefined : desiredChainId)
                        .then(() => props.setError(undefined))
                        .catch(props.setError)
                    : props.connector
                        .activate(desiredChainId === -1 ? undefined : getAddChainParameters(desiredChainId))
                        .then(() => props.setError(undefined))
                        .catch(props.setError)
          }
          disabled={props.isActivating}
        >
          Connect
        </button>
      </div>
    )
  }
}
