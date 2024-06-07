import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import nacl from "tweetnacl";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware";
import { createTaskInput } from '../types';
import "dotenv/config";
import { Connection, PublicKey} from '@solana/web3.js';

const connection = new Connection(process.env.RPC_URL ?? "");

const PARENT_WALLET = "4zsDjbdc89affo5mTbeDpSgpermTX7Ef5Cgf7TrBxHUm";

const router= Router();
const prismaClient = new PrismaClient;

prismaClient.$transaction(
    async (prisma)=>{
        //Code in txn
    },{
        maxWait: 5000,
        timeout:10000,
    }
)

const JWT_SECRET="mrb1nary123";

const s3Client = new S3Client({
    credentials:{
        accessKeyId: process.env.ACCESS_KEY!,
        secretAccessKey: process.env.SECRET_ACCESS_KEY!
    },
    region: "ap-south-1"
})


router.get("/task", authMiddleware, async (req, res) => {
    // @ts-ignore
    const taskId: string = req.query.taskId;
    // @ts-ignore
    const userId: string = req.userId;

    const taskDetails = await prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
        },
        include: {
            options: true
        }
    })

    if (!taskDetails) {
        return res.status(411).json({
            message: "You dont have access to this task"
        })
    }

    // Todo: Caching
    const responses = await prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        },
        include: {
            option: true
        }
    });

    const result: Record<string, {
        count: number;
        option: {
            imageUrl: string
        }
    }> = {};

    taskDetails.options.forEach(option => {
        result[option.id] = {
            count: 0,
            option: {
                imageUrl: option.image_url
            }
        }
    })

    responses.forEach(r => {
        result[r.option_id].count++;
    });

    res.json({
        result,
        taskDetails
    })

})

router.post("/task", authMiddleware, async (req, res)=>{
    //@ts-ignore
    const userId = req.userId;
    const body = req.body;

    const parseData = createTaskInput.safeParse(body);

    if(!parseData.success){
        return res.status(411).json({
            message: "Wrong input!"
        })
    }

    const user = await prismaClient.user.findFirst({
        where: {
            id: userId
        }
    })

    const transaction = await connection.getTransaction(parseData.data.signature, {
        maxSupportedTransactionVersion: 1
    });

    console.log(transaction);

    if ((transaction?.meta?.postBalances[1] ?? 0) - (transaction?.meta?.preBalances[1] ?? 0) !== 100000000) {
        return res.status(411).json({
            message: "Transaction signature/amount incorrect"
        })
    }

    if (transaction?.transaction.message.getAccountKeys().get(1)?.toString() !== PARENT_WALLET) {
        return res.status(411).json({
            message: "Transaction sent to wrong address"
        })
    }

    if (transaction?.transaction.message.getAccountKeys().get(0)?.toString() !== user?.address) {
        return res.status(411).json({
            message: "Transaction sent to wrong address"
        })
    }

    let response = await prismaClient.$transaction(async tx =>{
        const response = await tx.task.create({
            data:{
                title: parseData.data.title ?? "Click the best thumbnail",
                amount: Number(1 * 1000_000_000),
                signature: parseData.data.signature,
                user_id: userId
            }
        });

        await tx.option.createMany({
            data: parseData.data?.options.map(x=>({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        })

        return response;
    })

    res.json({
        id: response.id
    })
})


router.get("/presignedUrl", authMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId;

    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: 'solana-fiverr',
        Key: `${userId}/${Math.random()}/image.jpg`,
        Conditions: [
          ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Expires: 3600
    })

    res.json({
        preSignedUrl: url,
        fields
    })
    
})

router.post("/signin", async (req, res)=>{
    const {publicKey, signature} = req.body;
    const message = new TextEncoder().encode("Sign in to Solana Fiverr");

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

    const existingUser = await prismaClient.user.findFirst({
        where:{
            address: publicKey
        }
    })

    if (existingUser){
        const token = jwt.sign({
            userId: existingUser.id
        }, JWT_SECRET)

        res.json(token);
    } else {
        const user = await prismaClient.user.create({
            data:{
                address: publicKey
            }
        })
        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET)

        res.json(token);
    }
})

export default router;