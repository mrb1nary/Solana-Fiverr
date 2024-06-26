import Navbar from "./components/Navbar"
import Upload from "./components/Upload"
import TaskWrapper from "./utils/TaskWrapper"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    WalletModalProvider
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import "@solana/wallet-adapter-react-ui/styles.css"
import * as buffer from "buffer";
window.Buffer = buffer.Buffer;

function App() {

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
);
  

  return (
    <BrowserRouter>
      <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    
                      <div className="w-full h-full bg-gray-800 absolute">
                      <Navbar />
                      <Routes>
                        <Route path="/" element={<Upload />} />
                        <Route path="/task/:id" element={<TaskWrapper />} />
                      </Routes>
                      </div>
                </WalletModalProvider>
              </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  )
}

export default App
