import type { Networkish } from '@ethersproject/networks'
import type { BaseProvider, Web3Provider } from '@ethersproject/providers'
import { createWeb3SolidStoreAndActions } from '@web3-solid/store'
import type { Actions, Connector, Web3SolidState, Web3SolidStore } from '@web3-solid/types'
import { createEffect, createMemo, createSignal } from 'solid-js'
import { UseBoundStore } from 'solid-zustand'
import { EqualityChecker } from 'zustand'

let DynamicProvider: typeof Web3Provider | null | undefined
async function importProvider(): Promise<void> {
  if (DynamicProvider === undefined) {
    try {
      const { Web3Provider } = await import('@ethersproject/providers')
      DynamicProvider = Web3Provider
    } catch {
      console.debug('@ethersproject/providers not available')
      DynamicProvider = null
    }
  }
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
    // @ts-ignore
    const index = initializedConnectors.findIndex(([initializedConnector]) => connector === initializedConnector)
    if (index === -1) throw new Error('Connector not found')
    return index
  }

  function useSelectedStore(connector: Connector) {
    const store = initializedConnectors[getIndex(connector)][2]
    if (!store) throw new Error('Stores not passed')
    return store
  }

  // the following code calls hooks in a map a lot, which violates the eslint rule.
  // this is ok, though, because initializedConnectors never changes, so the same hooks are called each time
  function useSelectedChainId(connector: Connector) {
    // @ts-ignore
    const values = initializedConnectors.map(([, { useChainId }]: [Connector, Web3SolidHooks]) => useChainId())
    return values[getIndex(connector)]
  }

  function useSelectedAccounts(connector: Connector) {
    // @ts-ignore
    const values = initializedConnectors.map(([, { useAccounts }]) => useAccounts())
    return values[getIndex(connector)]
  }

  function useSelectedIsActivating(connector: Connector) {
    // @ts-ignore
    const values = initializedConnectors.map(([, { useIsActivating }]) => useIsActivating())
    return values[getIndex(connector)]
  }

  function useSelectedAccount(connector: Connector) {
    // @ts-ignore
    const values = initializedConnectors.map(([, { useAccount }]) => useAccount())
    return values[getIndex(connector)]
  }

  function useSelectedIsActive(connector: Connector) {
    // @ts-ignore
    const values = initializedConnectors.map(([, { useIsActive }]) => useIsActive())
    return values[getIndex(connector)]
  }

  /**
   * @typeParam T - A type argument must only be provided if one or more of the connectors passed to
   * getSelectedConnector is using `connector.customProvider`, in which case it must match every possible type of this
   * property, over all connectors.
   */
  function useSelectedProvider<T extends BaseProvider = Web3Provider>(
    connector: Connector,
    network?: Networkish
  ): T | undefined {
    const index = getIndex(connector)
    // @ts-ignore
    const values = initializedConnectors.map(([, { useProvider }], i) => useProvider<T>(network, i === index))
    // @ts-ignore
    return values[index]
  }

  function useSelectedENSNames(connector: Connector, provider?: BaseProvider) {
    const index = getIndex(connector)
    // @ts-ignore
    const values = initializedConnectors.map(([, { useENSNames }], i) =>
      useENSNames(i === index ? provider : undefined)
    )
    return values[index]
  }

  function useSelectedENSName(connector: Connector, provider?: BaseProvider) {
    const index = getIndex(connector)
    // @ts-ignore
    const values = initializedConnectors.map(([, { useENSName }], i) => useENSName(i === index ? provider : undefined))
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
    // @ts-ignore
    const values = initializedConnectors.map(([, { useIsActive }]) => useIsActive())
    const index = values.findIndex((isActive) => isActive)
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
  function usePriorityProvider<T extends BaseProvider = Web3Provider>(network?: Networkish) {
    return useSelectedProvider<T>(usePriorityConnector(), network)
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
  function useChainId() {
    return useConnector().chainId
  }

  function useAccounts() {
    return useConnector().accounts
  }

  function useIsActivating() {
    return useConnector().activating
  }

  return { useChainId, useAccounts, useIsActivating }
}

function getDerivedHooks({ useChainId, useAccounts, useIsActivating }: ReturnType<typeof getStateHooks>) {
  function useAccount(): string | undefined {
    const accounts = useAccounts()
    return accounts?.[0]
  }

  function useIsActive(): boolean | undefined {
    const chainId = useChainId()
    const accounts = useAccounts()
    const activating = useIsActivating()

    return computeIsActive({
      chainId,
      accounts,
      activating,
    })
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

    // ensure that Provider is going to be available when loaded if @ethersproject/providers is installed
    const [loaded, setLoaded] = createSignal(DynamicProvider !== undefined)
    createEffect(() => {
      if (loaded()) return
      let stale = false
      void importProvider().then(() => {
        if (stale) return
        setLoaded(true)
      })
    })

    const value = createMemo(() => {
      // to ensure connectors remain fresh, we condition re-renders on loaded, isActive and chainId

      void loaded() && isActive && chainId
      if (enabled) {
        if (connector.customProvider) return connector.customProvider as T
        // see tsdoc note above for return type explanation.
        else if (DynamicProvider && connector.provider)
          return new DynamicProvider(connector.provider, network) as unknown as T
      }
      return undefined
    })

    return value()
  }

  function useENSNames(provider?: BaseProvider): undefined[] | (string | null)[] {
    const accounts = useAccounts()
    return useENS(provider, accounts)
  }

  function useENSName(provider?: BaseProvider): undefined | string | null {
    const account = useAccount()
    const accounts = createMemo(() => (account === undefined ? undefined : [account]))
    return useENS(provider, accounts())?.[0]
  }

  return { useProvider, useENSNames, useENSName }
}
