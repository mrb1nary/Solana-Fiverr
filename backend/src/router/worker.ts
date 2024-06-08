import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { workerMiddleware } from "../middleware";
import { getNextTask } from "../dbFunctions";
import { createSubmissionInput } from "../types";
import nacl from "tweetnacl";
import { decode } from "bs58";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from "@solana/web3.js";

const router= Router();
const connection = new Connection(process.env.RPC_URL ?? "");

const JWT_WORKER_SECRET = "mrb1naryworker";
const prismaClient = new PrismaClient()
prismaClient.$transaction(
    async (prisma)=>{
        
    },{
        maxWait: 5000,
        timeout:10000,
    }
);
const TOTAL_SUBMISSION = 100;
const TOTAL_DECIMALS = 1000_000


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

    if(worker.pending_amount <= 0){
        return res.status(200).json({
            message: "You have no balance to withdraw"
        })
    }
    
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: new PublicKey("FFqp5uGm2mvnwmrkT945iQQF3MADzoH6a9rCZAi9xY6Y"),
            toPubkey: new PublicKey(worker.address),
            lamports: 1000_000_000 * worker.pending_amount / TOTAL_DECIMALS,
        })
    );

    // console.log(worker.address)
    // console.log(transaction);

    const secretKey = decode("22a615BHVywcmw7n2irrRpKztifBWcZjb9Wv2HsmVKBFuQndQV9tPaYmJU3HcJvxBAvCrWb9yQAaKLwkmzij5ew6");

    console.log(secretKey);
    const keypair = Keypair.fromSecretKey(secretKey);

    let signature = "";
    try {
        signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keypair],
        );
    
     } catch(e) {
        console.log(e)
        return res.json({
            message: "Transaction failed"
        })
     }

     console.log(signature);
    

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
                signature: signature,
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
            pendingAmount: worker?.pending_amount / TOTAL_DECIMALS,
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

            const existingSubmission = await tx.submission.findUnique({
                where: {
                  worker_id_task_id: {
                    worker_id: Number(userId),
                    task_id: Number(parsedBody.data.taskId)
                  }
                }
              });
              
              if (existingSubmission) {
                
                return res.status(409).json({
                  message: "Submission already exists for this worker and task."
                });
              }


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
        res.status(411).json({
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
    const {publicKey, signature} = req.body;
    const message = new TextEncoder().encode("Sign in to Solana Fiverr as worker");

    //Verify the singature

    const result = nacl.sign.detached.verify(
        message,
        new Uint8Array(signature.data),
        new PublicKey(publicKey).toBytes(),
      );
    
    if(!result){
        return res.status(401).json({
            message: "Verification failed"
        })
    }

    const existingUser = await prismaClient.worker.findFirst({
        where:{
            address: publicKey
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
                address: publicKey,
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