import {
  WalletDisconnectButton,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import {useWallet} from "@solana/wallet-adapter-react"


<WalletMultiButton />
<WalletDisconnectButton />
function Navbar() {
  const publicKey= useWallet()
  return (
    <div className="flex flex-row items-center justify-between space-between p-5 text-2xl bg-gray-900 sticky w-full h-20 text-red-300">
        <div>
            Solana-Fiverr &lt;Worker&gt; 
        </div>
        <div>
            {}
        </div>
    </div>
  )
}

export default Navbar