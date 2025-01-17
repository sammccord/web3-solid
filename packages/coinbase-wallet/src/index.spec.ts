import { createWeb3SolidStoreAndActions } from '@web3-solid/store'
import type { Actions, Web3SolidStore } from '@web3-solid/types'
import { CoinbaseWallet } from '.'
import { MockEIP1193Provider } from '../../eip1193/src/index.spec'

jest.mock(
  '@coinbase/wallet-sdk',
  () =>
    class MockCoinbaseWallet {
      makeWeb3Provider() {
        return new MockEIP1193Provider()
      }
    }
)

const chainId = '0x1'
const accounts: string[] = []

describe('Coinbase Wallet', () => {
  let store: Web3SolidStore
  let connector: CoinbaseWallet
  let mockConnector: MockEIP1193Provider

  describe('connectEagerly = true', () => {
    beforeEach(async () => {
      let actions: Actions
      ;[store, actions] = createWeb3SolidStoreAndActions()
      connector = new CoinbaseWallet({
        actions,
        options: {
          appName: 'test',
          url: 'https://mock.url',
        },
      })
      await connector.connectEagerly().catch(() => {})

      mockConnector = connector.provider as unknown as MockEIP1193Provider
      mockConnector.chainId = chainId
      mockConnector.accounts = accounts
    })

    test('#activate', async () => {
      await connector.activate()

      expect(store.getState()).toEqual({
        chainId: Number.parseInt(chainId, 16),
        accounts,
        activating: false,
      })
    })
  })
})
