import { vi } from 'vitest'
import { Web3Provider } from '@ethersproject/providers'
import { renderHook } from '@solidjs/testing-library'
import { startTransition as act } from 'solid-js'
import type { Actions } from '@web3-solid/types'
import { Connector } from '@web3-solid/types'
import EventEmitter from 'events'
import type { Web3SolidHooks, Web3SolidPriorityHooks, Web3SolidSelectedHooks } from './hooks'
import { getPriorityConnector, getSelectedConnector, initializeConnector } from './hooks'

class MockProvider extends EventEmitter {
  request = typeof jest !== 'undefined' ? jest.fn() : vi.fn()
}

class MockConnector extends Connector {
  provider = new MockProvider()

  constructor(actions: Actions) {
    super(actions)
  }
  public activate() {
    this.actions.startActivation()
  }
  public update(...args: Parameters<Actions['update']>) {
    this.actions.update(...args)
  }
}

class MockConnector2 extends MockConnector {}

describe('#initializeConnector', () => {
  let connector: MockConnector
  let hooks: Web3SolidHooks

  beforeEach(() => {
    ;[connector, hooks] = initializeConnector((actions) => new MockConnector(actions))
  })

  test('#useChainId', async () => {
    let { result } = renderHook(() => hooks.useChainId())
    expect(result()).toBe(undefined)

    await act(() => connector.update({ chainId: 1 }))
    expect(result()).toBe(1)
  })

  describe('#useAccounts', async () => {
    test('empty', async () => {
      const { result } = renderHook(() => hooks.useAccounts())
      expect(result()).toBe(undefined)

      await act(() => connector.update({ accounts: [] }))
      expect(result()).toEqual([])
    })

    test('single', async () => {
      const { result } = renderHook(() => hooks.useAccounts())
      expect(result()).toBe(undefined)

      await act(() => connector.update({ accounts: ['0x0000000000000000000000000000000000000000'] }))
      expect(result()).toEqual(['0x0000000000000000000000000000000000000000'])
    })

    test('multiple', async () => {
      const { result } = renderHook(() => hooks.useAccounts())
      expect(result()).toBe(undefined)

      await act(() =>
        connector.update({
          accounts: ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000001'],
        })
      )
      expect(result()).toEqual([
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000001',
      ])
    })
  })

  test('#useIsActivating', async () => {
    const { result } = renderHook(() => hooks.useIsActivating())
    expect(result()).toBe(false)

    await act(() => connector.activate())
    expect(result()).toEqual(true)
  })

  test('#useIsActive', async () => {
    const { result } = renderHook(() => hooks.useIsActive())
    expect(result()).toBe(false)

    await act(() => connector.update({ chainId: 1, accounts: [] }))
    expect(result()).toEqual(true)
  })

  describe('#useProvider', () => {
    test('lazy loads Web3Provider and rerenders', async () => {
      await act(() => connector.update({ chainId: 1, accounts: [] }))

      let { result } = renderHook(() => hooks.useProvider())
      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(Web3Provider)
    })
  })
})

describe('#getSelectedConnector', () => {
  let connector: MockConnector
  let hooks: Web3SolidHooks

  let connector2: MockConnector
  let hooks2: Web3SolidHooks

  let selectedConnectorHooks: Web3SolidSelectedHooks

  beforeEach(() => {
    ;[connector, hooks] = initializeConnector((actions) => new MockConnector(actions))
    ;[connector2, hooks2] = initializeConnector((actions) => new MockConnector2(actions))

    selectedConnectorHooks = getSelectedConnector([connector, hooks], [connector2, hooks2])
  })

  test('isActive is false for connector', () => {
    const {
      result: isActive,
    } = renderHook(() => selectedConnectorHooks.useSelectedIsActive(connector))

    expect(isActive()).toBe(false)
  })

  test('isActive is false for connector2', () => {
    const {
      result: isActive,
    } = renderHook(() => selectedConnectorHooks.useSelectedIsActive(connector2))

    expect(isActive()).toBe(false)
  })

  test('connector active', async () => {
    await act(() => connector.update({ chainId: 1, accounts: [] }))
    const {
      result: isActive,
    } = renderHook(() => selectedConnectorHooks.useSelectedIsActive(connector))

    const {
      result: isActive2,
    } = renderHook(() => selectedConnectorHooks.useSelectedIsActive(connector2))

    expect(isActive()).toBe(true)
    expect(isActive2()).toBe(false)
  })

  test('connector2 active', async () => {
    await act(() => connector2.update({ chainId: 1, accounts: [] }))
    const {
      result: isActive,
    } = renderHook(() => selectedConnectorHooks.useSelectedIsActive(connector))

    const {
      result: isActive2,
    } = renderHook(() => selectedConnectorHooks.useSelectedIsActive(connector2))

    expect(isActive()).toBe(false)
    expect(isActive2()).toBe(true)
  })
})

describe('#getPriorityConnector', () => {
  let connector: MockConnector
  let hooks: Web3SolidHooks

  let connector2: MockConnector
  let hooks2: Web3SolidHooks

  let priorityConnectorHooks: Web3SolidPriorityHooks

  beforeEach(() => {
    ;[connector, hooks] = initializeConnector((actions) => new MockConnector(actions))
    ;[connector2, hooks2] = initializeConnector((actions) => new MockConnector2(actions))

    priorityConnectorHooks = getPriorityConnector([connector, hooks], [connector2, hooks2])
  })

  test('returns first connector if both are uninitialized', () => {
    const {
      result: priorityConnector,
    } = renderHook(() => priorityConnectorHooks.usePriorityConnector())

    expect(priorityConnector).toBeInstanceOf(MockConnector)
    expect(priorityConnector).not.toBeInstanceOf(MockConnector2)
  })

  test('returns first connector if it is initialized', async () => {
    await act(() => connector.update({ chainId: 1, accounts: [] }))
    const {
      result: priorityConnector,
    } = renderHook(() => priorityConnectorHooks.usePriorityConnector())

    const {
      result: isActive,
    } = renderHook(() => priorityConnectorHooks.usePriorityIsActive())
    expect(isActive()).toBe(true)

    expect(priorityConnector).toBeInstanceOf(MockConnector)
    expect(priorityConnector).not.toBeInstanceOf(MockConnector2)
  })

  test('returns second connector if it is initialized', async () => {
    await act(() => connector2.update({ chainId: 1, accounts: [] }))
    const {
      result: priorityConnector,
    } = renderHook(() => priorityConnectorHooks.usePriorityConnector())

    const {
      result: isActive,
    } = renderHook(() => priorityConnectorHooks.usePriorityIsActive())
    expect(isActive()).toBe(true)

    expect(priorityConnector).toBeInstanceOf(MockConnector2)
  })
})
