import type { Networkish } from '@ethersproject/networks'
import type { BaseProvider, Web3Provider } from '@ethersproject/providers'
import { createWeb3SolidStoreAndActions } from '@web3-solid/store'
import type { Actions, Connector, Web3SolidState, Web3SolidStateAccessor, Web3SolidStore } from '@web3-solid/types'
import { create } from 'domain'
import { Accessor, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { UseBoundStore } from 'solid-zustand'
import { EqualityChecker } from 'zustand'

export let DynamicProvider: typeof Web3Provider | null | undefined
async function importProvider(): Promise<typeof Web3Provider | null | undefined> {
  if (!DynamicProvider) {
    try {
      const { Web3Provider } = await import('@ethersproject/providers')
      DynamicProvider = Web3Provider
      return Web3Provider
    } catch {
      console.debug('@ethersproject/providers not available')
      DynamicProvider = null
      return DynamicProvider
    }
  }
  return DynamicProvider
}

export type Web3SolidHooks = ReturnType<typeof getStateHooks> &
  ReturnType<typeof getDerivedHooks> &
  ReturnType<typeof getAugmentedHooks>

export type Web3SolidSelectedHooks = ReturnType<typeof getSelectedConnector>

export type Web3SolidPriorityHooks = ReturnType<typeof getPriorityConnector>

/**
 * Wraps the initialization of a `connector`. Creates a zustand `store` with `actions` bound to it, and then passes
 * these to the connector as specified in `f`. Also creates a variety of `hooks` bound to this `store`.
 *
 * @typeParam T - The type of the `connector` returned from `f`.
 * @param f - A function which is called with `actions` bound to the returned `store`.
 * @returns [connector, hooks, store] - The initialized connector, a variety of hooks, and a zustand store.
 */
export function initializeConnector<T extends Connector>(
  f: (actions: Actions) => T
): [T, Web3SolidHooks, Web3SolidStore] {
  const [store, actions] = createWeb3SolidStoreAndActions()

  const connector = f(actions)

  const stateHooks = getStateHooks(store)
  const derivedHooks = getDerivedHooks(stateHooks)
  const augmentedHooks = getAugmentedHooks<T>(connector, stateHooks, derivedHooks)

  return [connector, { ...stateHooks, ...derivedHooks, ...augmentedHooks }, store]
}

function computeIsActive({ chainId, accounts, activating }: Web3SolidState) {
  return Boolean(chainId && accounts && !activating)
}

/**
 * Creates a variety of convenience `hooks` that return data associated with a particular passed connector.
 *
 * @param initializedConnectors - Two or more [connector, hooks(, store)] arrays, as returned from initializeConnector.
 * @returns hooks - A variety of convenience hooks that wrap the hooks returned from initializeConnector.
 */
export function getSelectedConnector(
  ...initializedConnectors: [Connector, Web3SolidHooks][] | [Connector, Web3SolidHooks, Web3SolidStore][]
) {
  function getIndex(connector: Connector) {
    for(let i = 0; i < initializedConnectors.length; i++) {
      if(initializedConnectors[i][0] === connector) return i
    }
    throw new Error('Connector not found')
  }

  function useSelectedStore(connector: Connector) {
    const store = initializedConnectors[getIndex(connector)][2]
    if (!store) throw new Error('Stores not passed')
    return store
  }

  // the following code calls hooks in a map a lot, which violates the eslint rule.
  // this is ok, though, because initializedConnectors never changes, so the same hooks are called each time
  function useSelectedChainId(connector: Connector) {
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useChainId())

    return values[getIndex(connector)]
  }

  function useSelectedAccounts(connector: Connector) {
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useAccounts())
    return values[getIndex(connector)]
  }

  function useSelectedIsActivating(connector: Connector) {
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useIsActivating())
    return values[getIndex(connector)]
  }

  function useSelectedAccount(connector: Connector) {
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useAccount())
    return values[getIndex(connector)]
  }

  function useSelectedIsActive(connector: Connector) {
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useIsActive())
    return values[getIndex(connector)]
  }

  /**
   * @typeParam T - A type argument must only be provided if one or more of the connectors passed to
   * getSelectedConnector is using `connector.customProvider`, in which case it must match every possible type of this
   * property, over all connectors.
   */
  function useSelectedProvider(
    connector: Connector,
    network?: Networkish
  ) {
    const index = getIndex(connector)
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useProvider(network, i === index))
    
    return values[index]
  }

  function useSelectedENSNames(connector: Connector, provider?: BaseProvider) {
    const index = getIndex(connector)
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useENSNames(i === index ? provider : undefined))
      
    return values[index]
  }

  function useSelectedENSName(connector: Connector, provider?: BaseProvider) {
    const index = getIndex(connector)
    
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useENSName(i === index ? provider : undefined))
    return values[index]
  }

  return {
    useSelectedStore,
    useSelectedChainId,
    useSelectedAccounts,
    useSelectedIsActivating,
    useSelectedAccount,
    useSelectedIsActive,
    useSelectedProvider,
    useSelectedENSNames,
    useSelectedENSName,
  }
}

/**
 * Creates a variety of convenience `hooks` that return data associated with the first of the `initializedConnectors`
 * that is active.
 *
 * @param initializedConnectors - Two or more [connector, hooks(, store)] arrays, as returned from initializeConnector.
 * @returns hooks - A variety of convenience hooks that wrap the hooks returned from initializeConnector.
 */
export function getPriorityConnector(
  ...initializedConnectors: [Connector, Web3SolidHooks][] | [Connector, Web3SolidHooks, Web3SolidStore][]
) {
  const {
    useSelectedStore,
    useSelectedChainId,
    useSelectedAccounts,
    useSelectedIsActivating,
    useSelectedAccount,
    useSelectedIsActive,
    useSelectedProvider,
    useSelectedENSNames,
    useSelectedENSName,
  } = getSelectedConnector(...initializedConnectors)

  function usePriorityConnector() {
    const values = Array.from({ length: initializedConnectors.length }, (k, i) => initializedConnectors[i][1].useIsActive())
    const index = values.findIndex((isActive) => isActive())
    return initializedConnectors[index === -1 ? 0 : index][0]
  }

  function usePriorityStore() {
    return useSelectedStore(usePriorityConnector())
  }

  function usePriorityChainId() {
    return useSelectedChainId(usePriorityConnector())
  }

  function usePriorityAccounts() {
    return useSelectedAccounts(usePriorityConnector())
  }

  function usePriorityIsActivating() {
    return useSelectedIsActivating(usePriorityConnector())
  }

  function usePriorityAccount() {
    return useSelectedAccount(usePriorityConnector())
  }

  function usePriorityIsActive() {
    return useSelectedIsActive(usePriorityConnector())
  }

  /**
   * @typeParam T - A type argument must only be provided if one or more of the connectors passed to
   * getPriorityConnector is using `connector.customProvider`, in which case it must match every possible type of this
   * property, over all connectors.
   */
  function usePriorityProvider(network?: Networkish) {
    return useSelectedProvider(usePriorityConnector(), network)
  }

  function usePriorityENSNames(provider?: BaseProvider) {
    return useSelectedENSNames(usePriorityConnector(), provider)
  }

  function usePriorityENSName(provider?: BaseProvider) {
    return useSelectedENSName(usePriorityConnector(), provider)
  }

  return {
    useSelectedStore,
    useSelectedChainId,
    useSelectedAccounts,
    useSelectedIsActivating,
    useSelectedAccount,
    useSelectedIsActive,
    useSelectedProvider,
    useSelectedENSNames,
    useSelectedENSName,
    usePriorityConnector,
    usePriorityStore,
    usePriorityChainId,
    usePriorityAccounts,
    usePriorityIsActivating,
    usePriorityAccount,
    usePriorityIsActive,
    usePriorityProvider,
    usePriorityENSNames,
    usePriorityENSName,
  }
}

const CHAIN_ID = (state: Web3SolidState) => state.chainId
const ACCOUNTS = ({ accounts }: Web3SolidState) => accounts
const ACCOUNTS_EQUALITY_CHECKER: EqualityChecker<Web3SolidState['accounts']> = (oldAccounts, newAccounts) =>
  (oldAccounts === undefined && newAccounts === undefined) ||
  (oldAccounts !== undefined &&
    oldAccounts.length === newAccounts?.length &&
    oldAccounts.every((oldAccount, i) => oldAccount === newAccounts[i]))
const ACTIVATING = ({ activating }: Web3SolidState) => activating

function getStateHooks(useConnector: UseBoundStore<Web3SolidStore>) {
  const [chainId, setChainId] = createSignal<number | undefined>(useConnector.getState().chainId, { equals: false })
  const [accounts, setAccounts] = createSignal<string[] | undefined>(useConnector.getState().accounts, { equals: false })
  const [activating, setActivating] = createSignal<boolean | undefined>(useConnector.getState().activating, { equals: false })

  const unsubscribe = useConnector.subscribe(state => {
    setChainId(() => state.chainId)
    setAccounts(() => state.accounts)
    setActivating(() => state.activating)
  })
  onCleanup(() => {
    unsubscribe()
  })


  function useChainId(): Web3SolidStateAccessor['chainId'] {
    return chainId
  }

  function useAccounts() : Web3SolidStateAccessor['accounts'] {
    return accounts
  }

  function useIsActivating(): Web3SolidStateAccessor['activating'] {
    return activating
  }

  return { useChainId, useAccounts, useIsActivating }
}

function getDerivedHooks({ useChainId, useAccounts, useIsActivating }: ReturnType<typeof getStateHooks>) {
  function useAccount(): Accessor<string | undefined> {
    const accounts = useAccounts()
    return createMemo(() => accounts()?.[0])
  }

  function useIsActive(): Accessor<boolean | undefined> {
    const chainId = useChainId()
    const accounts = useAccounts()
    const activating = useIsActivating()

    const isActive = createMemo(() => {
     return computeIsActive({
      chainId: chainId(),
      accounts: accounts(),
      activating: activating(),
     })
    })

    return isActive
  }

  return { useAccount, useIsActive }
}

/**
 * @returns ENSNames - An array of length `accounts.length` which contains entries which are either all `undefined`,
 * indicated that names cannot be fetched because there's no provider, or they're in the process of being fetched,
 * or `string | null`, depending on whether an ENS name has been set for the account in question or not.
 */
function useENS(provider?: BaseProvider, accounts: string[] = []): undefined[] | (string | null)[] {
  const [ENSNames, setENSNames] = createSignal<(string | null)[] | undefined>()

  createEffect(() => {
    if (provider && accounts.length) {
      let stale = false

      Promise.all(accounts.map((account) => provider.lookupAddress(account)))
        .then((ENSNames) => {
          if (stale) return 
          setENSNames(ENSNames)
        })
        .catch((error) => {
          if (stale) return
          console.debug('Could not fetch ENS names', error)
          setENSNames(new Array<null>(accounts.length).fill(null))
        })
    }
  })

  return ENSNames() ?? new Array<undefined>(accounts.length).fill(undefined)
}

function getAugmentedHooks<T extends Connector>(
  connector: T,
  { useAccounts, useChainId }: ReturnType<typeof getStateHooks>,
  { useAccount, useIsActive }: ReturnType<typeof getDerivedHooks>
) {
  const [providers, setProviders] = createSignal<{ Web3Provider: typeof Web3Provider } | undefined>(undefined)
  // ensure that Provider is going to be available when loaded if @ethersproject/providers is installed
  createEffect(() => {
    importProvider()
      .then(p => p && setProviders({ Web3Provider: p }))
  })
  /**
   * Avoid type erasure by returning the most qualified type if not otherwise set.
   * Note that this function's return type is `T | undefined`, but there is a code path
   * that returns a Web3Provider, which could conflict with a user-provided T. So,
   * it's important that users only provide an override for T if they know that
   * `connector.customProvider` is going to be defined and of type T.
   *
   * @typeParam T - A type argument must only be provided if using `connector.customProvider`, in which case it
   * must match the type of this property.
   */
  function useProvider<T extends BaseProvider = Web3Provider>(network?: Networkish, enabled = true): T | undefined {
    const isActive = useIsActive()
    const chainId = useChainId()

    const value = createMemo(() => {
      // to ensure connectors remain fresh, we condition re-renders on loaded, isActive and chainId
      if (providers() && enabled && isActive() && chainId()) {
        if (connector.customProvider) return connector.customProvider as T
        // see tsdoc note above for return type explanation.
        else if (providers() && connector.provider) {
          const provider = providers()
          return new provider.Web3Provider(connector.provider, network) as unknown as T
        }          
      }
      return undefined
    })

    return value()
  }

  function useENSNames(provider?: BaseProvider): undefined[] | (string | null)[] {
    const accounts = useAccounts()
    return useENS(provider, accounts())
  }

  function useENSName(provider?: BaseProvider): undefined | string | null {
    const account = useAccount()
    const accounts = createMemo(() => (account() === undefined ? undefined : [account()]))
    const ens = useENS(provider, accounts())

    return ens?.[0]
  }

  return { useProvider, useENSNames, useENSName }
}
