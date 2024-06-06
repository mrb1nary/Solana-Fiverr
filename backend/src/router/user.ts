import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware";
import { createTaskInput } from '../types';
import "dotenv/config";

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
    const hardcodedWallet = "FFqp5uGm2mvnwmrkT945iQQF3MADzoH6a9rCZAi9xY6Y"

    const existingUser = await prismaClient.user.findFirst({
        where:{
            address: hardcodedWallet
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
                address: hardcodedWallet
            }
        })
        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET)

        res.json(token);
    }
})

export default router;