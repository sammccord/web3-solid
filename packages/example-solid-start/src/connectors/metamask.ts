import { initializeConnector } from '@web3-solid/core'
import { MetaMask } from '@web3-solid/metamask'

export const [metaMask, hooks] = initializeConnector<MetaMask>((actions) => new MetaMask({ actions }))
