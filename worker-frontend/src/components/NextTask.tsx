import axios from "axios";
import {BACKEND_URL} from "../utils/utils"
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function NextTask(){

    interface Task {
        "id": number,
        "amount": string,
        "title": string,
        "options": {
            id: number;
            image_url: string;
            task_id: number
        }[]
    }


    const [task, setTask] = useState<Task | null>()
    const [loading, setLoading] = useState(false)
    const {publicKey} = useWallet();

    useEffect(() => {
        setLoading(true);
        axios.get(`${BACKEND_URL}/v1/worker/nextTask`, {
            headers: {
                "Authorization": localStorage.getItem("token")
            }
        })
            .then(res => {
                setTask(res.data.task);
                setLoading(false)
            })
            .catch(e => {
                setLoading(false)
                setTask(null)
                console.log(e)
            })
    }, [])


    if(loading){
        return (
            <h2 className="h-screen flex flex-col justify-center items-center text-2xl text-white">Please wait. Next Task is Loading</h2>
        )
    }

    if(!publicKey){
        return(
            <h2 className="h-screen flex flex-col justify-center items-center text-3xl text-red-400">You are not signed in</h2>
        )
    }

    if(!task){
        
        return (
            <h2 className="h-screen flex justify-center items-center text-2xl text-white">
                No Tasks at the moment
            </h2>
        )
    }
    
    
    
    
    return (
        <>
    <div>
        <div className='text-2xl pt-20 flex justify-center items-center text-white'>
        {task.title}
    </div>
        <p className="text-2xl flex justify-center items-center text-red-200">Task ID ${task.id}</p>
    <div className='flex justify-center pt-8 text-white'>
        {task.options.map(option => (
        <Option onSelect={async()=>{
            const response = await axios.post(`${BACKEND_URL}/v1/worker/submission`,{
                taskId: task.id.toString(),
                selection: option.id.toString()
            },{
                headers:{
                    "Authorization": localStorage.getItem("token")
                }
            });

            const nextTask = response.data.nextTask;
            if(nextTask){
                setTask(nextTask)
            }
            if(!nextTask){
                setTask(null)
            }
        }} key={option.id} imageUrl={option.image_url}/>
        ))}
    </div>
    </div>
    </>
    )

function Option({imageUrl, onSelect }: {
    imageUrl: string;
    onSelect: () => void;
    }) {
        return <div>
        <img onClick={onSelect} className={"p-2 w-96 rounded-md"} src={imageUrl} />
        </div>
    }
}