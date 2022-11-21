import { Title } from "solid-start";
import CoinbaseWalletCard from '~/components/connectorCards/CoinbaseWalletCard'
import MetaMaskCard from '~/components/connectorCards/MetaMaskCard'
import WalletConnectCard from '~/components/connectorCards/WalletConnectCard'
// import ProviderExample from '../components/ProviderExample'

export default function Home() {
  return (
    <>
      {/* <ProviderExample /> */}
      <div style={{ display: 'flex', "flex-flow": 'wrap', "font-family": 'sans-serif' }}>
        <MetaMaskCard />
        <WalletConnectCard />
        <CoinbaseWalletCard />
      </div>
    </>
  )
}
