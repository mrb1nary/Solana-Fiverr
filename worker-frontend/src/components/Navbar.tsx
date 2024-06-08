import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton, WalletDisconnectButton } from "@solana/wallet-adapter-react-ui";
import { BACKEND_URL } from "../utils/utils";
import { useEffect, useRef, useState } from "react";
import axios from "axios";


function Navbar() {
  const [balance, setBalance] = useState();
  const {publicKey, signMessage} = useWallet();
  const hasSignedIn = useRef(false)
  
  // console.log(balance)
  async function loadBalance(){
    const balance = await axios.get(`${BACKEND_URL}/v1/worker/balance`,{
      headers:{
        "Authorization" : localStorage.getItem("token")
      }
    })
    setBalance(balance.data.pendingAmount)
  }

  async function withdraw(){
    axios.post(`${BACKEND_URL}/v1/worker/payout`,{

    },{
      headers:{
        "Authorization" : localStorage.getItem("token")
      }
    })
  }
  async function signAndSend(){
    const message = new TextEncoder().encode("Sign in to Solana Fiverr as worker");
    const signature = await signMessage?.(message)
    const response = await axios.post(`${BACKEND_URL}/v1/worker/signin`,{
      signature,
      publicKey: publicKey?.toString()
    });
    
    localStorage.setItem("token", response.data);
  }

  useEffect(() => {
    loadBalance();
    if (publicKey && !hasSignedIn.current) {
      signAndSend();
      hasSignedIn.current = true; // Set the ref to true after signing in
    }
  }, [publicKey]);

  useEffect(() => {
    loadBalance();

    const intervalId = setInterval(() => {
      loadBalance();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="flex flex-row items-center justify-between space-between p-5 text-2xl bg-gray-900 sticky w-full h-20 text-red-300">
        <div>
            Solana-Fiverr &lt;Worker/&gt;
        </div>
        <div className="flex flex-row items-center justify-center">
            <button onClick={withdraw} className="mr-10 pr-5 rounded-2xl bg-green-700 h-10 pl-5 text-white">Withdraw: {balance ? `${balance/1000000000} Sol` : "0" }</button>
            {publicKey? <WalletDisconnectButton/> : <WalletMultiButton/>}
        </div>
    </div>
  )
}

export default Navbar