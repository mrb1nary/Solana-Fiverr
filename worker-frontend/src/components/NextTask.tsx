import axios from "axios";
import {BACKEND_URL} from "../utils/utils"
import { useEffect, useState } from "react";

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
            <h2>Please wait. Next Task is Loading</h2>
        )
    }

    if(!task){
        
        return (
            <h2 className="text-white">
                No Tasks at the moment
            </h2>
        )
    }
    
    
    return (
        <>
    <div>
        <div className='text-2xl pt-20 flex justify-center text-white'>
        {task.title}
    </div>
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