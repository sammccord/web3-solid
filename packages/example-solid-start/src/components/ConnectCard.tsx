import { CoinbaseWallet } from '@web3-solid/coinbase-wallet'
import { Web3SolidHooks } from '@web3-solid/core'
import { MetaMask } from '@web3-solid/metamask'
import { WalletConnect } from '@web3-solid/walletconnect'
import { getName } from '~/utils'
import { Accounts } from './Accounts'
import { Chain } from './Chain'
import { ConnectWithSelect } from './ConnectWithSelect'
import { Status } from './Status'

interface Props {
  connector: MetaMask | WalletConnect | CoinbaseWallet
  chainId: ReturnType<Web3SolidHooks['useChainId']>
  isActivating: ReturnType<Web3SolidHooks['useIsActivating']>
  isActive: ReturnType<Web3SolidHooks['useIsActive']>
  error: Error | undefined
  setError: (error: Error | undefined) => void
  ENSNames: ReturnType<Web3SolidHooks['useENSNames']>
  provider?: ReturnType<Web3SolidHooks['useProvider']>
  accounts?: ReturnType<Web3SolidHooks['useAccounts']>
}

export function Card(props: Props) {
  return (
    <div
      style={{
        display: 'flex',
        "flex-direction": 'column',
        "justify-content": 'space-between',
        width: '20rem',
        padding: '1rem',
        margin: '1rem',
        overflow: 'auto',
        border: '1px solid',
        "border-radius": '1rem',
      }}
    >
      <b>{getName(props.connector)}</b>
      <div style={{ "margin-bottom": '1rem' }}>
        <Status isActivating={props.isActivating} isActive={props.isActive} error={props.error} />
      </div>
      <Chain chainId={props.chainId} />
      <div style={{ "margin-bottom": '1rem' }}>
        <Accounts accounts={props.accounts} provider={props.provider} ENSNames={props.ENSNames} />
      </div>
      <ConnectWithSelect
        connector={props.connector}
        chainId={props.chainId}
        isActivating={props.isActivating}
        isActive={props.isActive}
        error={props.error}
        setError={props.setError}
      />
    </div>
  )
}
