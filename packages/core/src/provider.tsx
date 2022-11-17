import type { Networkish } from '@ethersproject/networks'
import type { BaseProvider, Web3Provider } from '@ethersproject/providers'
import type { Connector, Web3SolidStore } from '@web3-solid/types'
import { createContext, createMemo, JSX, Ref, useContext } from 'solid-js'
import type { Web3SolidHooks, Web3SolidPriorityHooks } from './hooks'
import { getPriorityConnector } from './hooks'

/**
 * @typeParam T - A type argument must only be provided if one or more of the connectors passed to Web3SolidProvider
 * is using `connector.customProvider`, in which case it must match every possible type of this
 * property, over all connectors.
 */
export type Web3ContextType<T extends BaseProvider = Web3Provider> = {
  connector: Connector
  chainId: ReturnType<Web3SolidPriorityHooks['useSelectedChainId']>
  accounts: ReturnType<Web3SolidPriorityHooks['useSelectedAccounts']>
  isActivating: ReturnType<Web3SolidPriorityHooks['useSelectedIsActivating']>
  account: ReturnType<Web3SolidPriorityHooks['useSelectedAccount']>
  isActive: ReturnType<Web3SolidPriorityHooks['useSelectedIsActive']>
  provider: T | undefined
  ENSNames: ReturnType<Web3SolidPriorityHooks['useSelectedENSNames']>
  ENSName: ReturnType<Web3SolidPriorityHooks['useSelectedENSName']>
  hooks: ReturnType<typeof getPriorityConnector>
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

/**
 * @param children - A Solid subtree that needs access to the context.
 * @param connectors - Two or more [connector, hooks(, store)] arrays, as returned from initializeConnector.
 * If modified in place without re-rendering the parent component, will result in an error.
 * @param connectorOverride - A connector whose state will be reflected in useWeb3Solid if set, overriding the
 * priority selection.
 * @param network - An optional argument passed along to `useSelectedProvider`.
 * @param lookupENS - A flag to enable/disable ENS lookups.
 */
export interface Web3SolidProviderProps {
  children: JSX.Element
  connectors: [Connector, Web3SolidHooks][] | [Connector, Web3SolidHooks, Web3SolidStore][]
  connectorOverride?: Connector
  network?: Networkish
  lookupENS?: boolean
}

// {
//   children,
//   connectors,
//   connectorOverride,
//   network,
//   lookupENS = true,
// }

export function Web3SolidProvider(props: Web3SolidProviderProps) {
  const cachedConnectors: Ref<Web3SolidProviderProps['connectors']> = props.connectors
  // because we're calling `getPriorityConnector` with these connectors, we need to ensure that they're not changing in place
  if (
    props.connectors.length != cachedConnectors.length ||
    props.connectors.some((connector, i) => {
      const cachedConnector = cachedConnectors[i]
      // because a "connector" is actually an array, we want to be sure to only perform an equality check on the actual Connector
      // class instance, to see if they're the same object
      return connector[0] !== cachedConnector[0]
    })
  )
    throw new Error(
      'The connectors prop passed to Web3SolidProvider must be referentially static. If connectors is changing, try providing a key prop to Web3SolidProvider that changes every time connectors changes.'
    )

  const hooks = getPriorityConnector(...props.connectors)
  const {
    usePriorityConnector,
    useSelectedChainId,
    useSelectedAccounts,
    useSelectedIsActivating,
    useSelectedAccount,
    useSelectedIsActive,
    useSelectedProvider,
    useSelectedENSNames,
    useSelectedENSName,
  } = hooks

  const priorityConnector = usePriorityConnector()
  const connector = props.connectorOverride ?? priorityConnector

  const chainId = useSelectedChainId(connector)
  const accounts = useSelectedAccounts(connector)
  const isActivating = useSelectedIsActivating(connector)
  const account = useSelectedAccount(connector)
  const isActive = useSelectedIsActive(connector)
  // note that we've omitted a <T extends BaseProvider = Web3Provider> generic type
  // in Web3SolidProvider, and thus can't pass T through to useSelectedProvider below.
  // this is because if we did so, the type of provider would include T, but that would
  // conflict because Web3Context can't take a generic. however, this isn't particularly
  // important, because useWeb3Solid (below) is manually typed
  const provider = useSelectedProvider(connector, props.network)
  const ENSNames = useSelectedENSNames(connector, props.lookupENS ? provider : undefined)
  const ENSName = useSelectedENSName(connector, props.lookupENS ? provider : undefined)

  return (
    <Web3Context.Provider
      value={{
        connector,
        chainId,
        accounts,
        isActivating,
        account,
        isActive,
        provider,
        ENSNames,
        ENSName,
        hooks,
      }}
    >
      {props.children}
    </Web3Context.Provider>
  )
}

export function useWeb3Solid<T extends BaseProvider = Web3Provider>() {
  const context = useContext(Web3Context)
  if (!context) throw Error('useWeb3Solid can only be used within the Web3SolidProvider component')
  return context
}
