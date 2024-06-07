import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import  UploadImage  from "./UploadImage";
import { BACKEND_URL } from "../utils/utils";
import axios from "axios";
import { useNavigate, Router } from "react-router";
import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export default function Upload(){
    const [images, setImages] = useState<string[]>([]);
    const [title, setTitle] = useState("");
    const [txSignature, setTxSignature] = useState("");
    const {publicKey, sendTransaction} = useWallet();
    const {connection} = useConnection();
    const navigate= useNavigate();
    

    async function onSubmit() {
        const response = await axios.post(`${BACKEND_URL}/v1/user/task`, {
            options: images.map(image => ({
                imageUrl: image,
            })),
            title,
            signature: txSignature
        }, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        })
        <Router>
            navigate(`/task/${response.data.id}`);
        <Router />
    }

    async function makePayment(){
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey!,
                toPubkey: new PublicKey("4zsDjbdc89affo5mTbeDpSgpermTX7Ef5Cgf7TrBxHUm"),
                lamports: 10000000,
            })
        );

        const {
            context:{slot:minContextSlot},
            value:{blockhash, lastValidBlockHeight}
        } = await connection.getLatestBlockhashAndContext();

        const signature = await sendTransaction(transaction, connection, {minContextSlot});

        await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});
        setTxSignature(signature);
        }
    

    

    return (<div className="flex justify-center">
        <div className="max-w-screen-lg w-full">
            <div className="text-2xl text-left pt-20 w-full pl-4 text-white">
                Create a task
            </div>

            <label className="pl-4 block mt-2 text-md font-medium text-white">Task details</label>

            <input onChange={(e) => {
                setTitle(e.target.value);
            }} type="text" id="first_name" className="ml-4 mt-1 bg-gray-50 border border-gray-300 text-black text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" placeholder="What is your task?" required />

            <label className="pl-4 block mt-8 text-md font-medium text-white">Add Images</label>
            <div className="flex justify-center pt-4 max-w-screen-lg">
                {images.map(image => <UploadImage image={image} onImageAdded={(imageUrl) => {
                    setImages(i => [...i, imageUrl]);
                }} />)}
            </div>

        <div className="ml-4 pt-2 flex justify-center">
            <UploadImage onImageAdded={(imageUrl) => {
                setImages(i => [...i, imageUrl]);
            }} />
        </div>

        <div className="flex justify-center">
            <button onClick={onSubmit} type="button" className="mt-4 text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-full text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700">
                {txSignature ? "Submit Task" : "Pay 0.1 SOL"}
            </button>
        </div>
        
      </div>
    </div>)
}