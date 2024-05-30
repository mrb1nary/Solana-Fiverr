import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { workerMiddleware } from "../middleware";
import { getNextTask } from "../dbFunctions";
import { createSubmissionInput } from "../types";

const router= Router();

const JWT_WORKER_SECRET = "mrb1naryworker";
const prismaClient = new PrismaClient()
const TOTAL_SUBMISSION = 100;


router.post("/payout", workerMiddleware, async (req,res)=>{
    //@ts-ignore
    const userId: string = req.userId;
    const worker = await prismaClient.worker.findFirst({
        where:{id: Number(userId)}
    })

    if(!worker){
        return res.status(403).json({
            message: "User not found"
        })
    }

    const address = worker.address;

    const txnId = "0x123ne"

    if(worker.pending_amount <= 0){
        return res.status(200).json({
            message: "You have no balance to withdraw"
        })
    }

    await prismaClient.$transaction(async tx=>{
        await tx.worker.update({
            where:{
                id: Number(userId)
            },
            data:{
                pending_amount:{
                    decrement: worker.pending_amount
                },
                locked_amount:{
                    increment: worker.pending_amount
                }
            }
        })

        await tx.payouts.create({
            data:{
                user_id: Number(userId),
                amount: worker.locked_amount,
                signature: txnId,
                status: "Processing"
            }
        })
    })

    res.status(200).json({
        message: "Processing payment",
        amount: worker.pending_amount
    })

    //Add web3 logic here
})

router.get("/balance", workerMiddleware, async (req, res)=>{
    //@ts-ignore
    const userId:string = req.userId;

    const worker = await prismaClient.worker.findFirst({
        where:{
            id: Number(userId)
        }
    })

    if(!worker){
        res.status(400).json({
            message: "Couldn't find user ID"
        })
    }else{
        res.status(200).json({
            pendingAmount: worker?.pending_amount,
            lockedAmount: worker?.locked_amount
        })

    }

})

router.post("/submission", workerMiddleware, async(req, res)=>{
    // @ts-ignore
    const userId: string = req.userId;
    const parsedBody = createSubmissionInput.safeParse(req.body);
    
    if(parsedBody.success){
        const task = await getNextTask(Number(userId))
        if(!task){
            return res.status(411).json({
                message: "Wrong task ID"
            })
        }

        const amount = (Number(task.amount) / TOTAL_SUBMISSION).toString();

        const submission = await prismaClient.$transaction(async tx=>{
            const submission = await tx.submission.create({
                data: {
                    option_id: Number(parsedBody.data.selection),
                    worker_id: Number(userId),
                    task_id: Number(parsedBody.data.taskId),
                    amount: Number(amount)
                }
            })

            await tx.worker.update({
                where:{
                    
                    id: Number(userId)
                },
                data:{
                    pending_amount:{
                        increment: Number(amount)
                    }
                }
            })

            return submission
        })

        

        const nextTask = await getNextTask(Number(userId)) ?? "";
        res.json({
            nextTask,
            amount
        })
        
    }else{
        res.status(200).json({
            message: "Parsing body failed"
        })
    }
})

router.get("/nextTask", workerMiddleware, async (req, res)=>{
    // @ts-ignore
    const userId: string = req.userId;
    const parsedBody = createSubmissionInput.safeParse(req.body);

    const task = await getNextTask(Number(userId))
    
    if(!task){
        res.status(411).json({
            message: "Out of tasks for now"
        })
    }else{
        res.status(200).json({task})
    }
})

router.post("/signin", async (req, res)=>{
    const hardcodedWallet = "FFqp5uGm2mvnwmrkT945iQQF3MADzoH6a9rCZAi9xY6Y"

    const existingUser = await prismaClient.worker.findFirst({
        where:{
            address: hardcodedWallet
        }
    })

    if (existingUser){
        const token = jwt.sign({
            userId: existingUser.id
        }, JWT_WORKER_SECRET)

        res.json(token);
    } else {
        const user = await prismaClient.worker.create({
            data:{
                address: hardcodedWallet,
                pending_amount: 0,
                locked_amount: 0
            }
        })
        const token = jwt.sign({
            userId: user.id
        }, JWT_WORKER_SECRET)

        res.json(token);
    }
})

export default router;