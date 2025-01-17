import { createWeb3SolidStoreAndActions } from '@web3-solid/store'
import type { Actions, Web3SolidStore } from '@web3-solid/types'
import { Url } from '.'
import { MockJsonRpcProvider } from '../../network/src/index.spec'

jest.mock('@ethersproject/providers', () => ({
  JsonRpcProvider: MockJsonRpcProvider,
}))

const chainId = '0x1'
const accounts: string[] = []

describe('Url', () => {
  let store: Web3SolidStore
  let connector: Url
  let mockConnector: MockJsonRpcProvider

  describe('works', () => {
    beforeEach(() => {
      let actions: Actions
      ;[store, actions] = createWeb3SolidStoreAndActions()
      connector = new Url({ actions, url: 'https://mock.url' })
    })

    test('is un-initialized', async () => {
      expect(store.getState()).toEqual({
        chainId: undefined,
        accounts: undefined,
        activating: false,
        error: undefined,
      })
    })

    describe('#activate', () => {
      beforeEach(async () => {
        // testing hack to ensure the provider is set
        await connector.activate()
        mockConnector = connector.customProvider as unknown as MockJsonRpcProvider
        mockConnector.chainId = chainId
      })

      test('works', async () => {
        await connector.activate()

        expect(store.getState()).toEqual({
          chainId: Number.parseInt(chainId, 16),
          accounts,
          activating: false,
          error: undefined,
        })
      })
    })
  })
})
