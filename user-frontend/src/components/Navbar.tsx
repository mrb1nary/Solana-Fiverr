import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton, WalletDisconnectButton } from "@solana/wallet-adapter-react-ui";
import { BACKEND_URL } from "../utils/utils";
import { useEffect, useRef } from "react";
import axios from "axios";

function Navbar() {
  const {publicKey, signMessage} = useWallet();
  const hasSignedIn = useRef(false)

  async function signAndSend(){
    const message = new TextEncoder().encode("Sign in to Solana Fiverr");
    const signature = await signMessage?.(message)
    const response = await axios.post(`${BACKEND_URL}/v1/user/signin`,{
      signature,
      publicKey: publicKey?.toString()
    });
    
    localStorage.setItem("token", response.data);
  }

  useEffect(() => {
    if (publicKey && !hasSignedIn.current) {
      signAndSend();
      hasSignedIn.current = true; // Set the ref to true after signing in
    }
  }, [publicKey]);
  return (
    <div className="flex flex-row items-center justify-between space-between p-5 text-2xl bg-gray-900 sticky w-full h-20 text-red-300">
        <div>
            Solana-Fiverr
        </div>
        <div>
            {publicKey? <WalletDisconnectButton/> : <WalletMultiButton/>}
        </div>
    </div>
  )
}

export default Navbar