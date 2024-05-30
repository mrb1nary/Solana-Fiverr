"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const client_s3_1 = require("@aws-sdk/client-s3");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const middleware_1 = require("../middleware");
const types_1 = require("../types");
require("dotenv/config");
const router = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient;
const JWT_SECRET = "mrb1nary123";
const s3Client = new client_s3_1.S3Client({
    credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    },
    region: "ap-south-1"
});
router.get("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const taskId = req.query.taskId;
    // @ts-ignore
    const userId = req.userId;
    const taskDetails = yield prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
        },
        include: {
            options: true
        }
    });
    if (!taskDetails) {
        return res.status(411).json({
            message: "You dont have access to this task"
        });
    }
    // Todo: Caching
    const responses = yield prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        },
        include: {
            option: true
        }
    });
    const result = {};
    taskDetails.options.forEach(option => {
        result[option.id] = {
            count: 0,
            option: {
                imageUrl: option.image_url
            }
        };
    });
    responses.forEach(r => {
        result[r.option_id].count++;
    });
    res.json({
        result,
        taskDetails
    });
}));
router.post("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const body = req.body;
    const parseData = types_1.createTaskInput.safeParse(body);
    if (!parseData.success) {
        return res.status(411).json({
            message: "Wrong input!"
        });
    }
    let response = yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const response = yield tx.task.create({
            data: {
                title: (_a = parseData.data.title) !== null && _a !== void 0 ? _a : "Click the best thumbnail",
                amount: Number(1 * 1000000000),
                signature: parseData.data.signature,
                user_id: userId
            }
        });
        yield tx.option.createMany({
            data: (_b = parseData.data) === null || _b === void 0 ? void 0 : _b.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        });
        return response;
    }));
    res.json({
        id: response.id
    });
}));
router.get("/presignedUrl", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const { url, fields } = yield (0, s3_presigned_post_1.createPresignedPost)(s3Client, {
        Bucket: 'solana-fiverr',
        Key: `${userId}/${Math.random()}/image.jpg`,
        Conditions: [
            ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Expires: 3600
    });
    res.json({
        preSignedUrl: url,
        fields
    });
}));
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hardcodedWallet = "FFqp5uGm2mvnwmrkT945iQQF3MADzoH6a9rCZAi9xY6Y";
    const existingUser = yield prismaClient.user.findFirst({
        where: {
            address: hardcodedWallet
        }
    });
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({
            userId: existingUser.id
        }, JWT_SECRET);
        res.json(token);
    }
    else {
        const user = yield prismaClient.user.create({
            data: {
                address: hardcodedWallet
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id
        }, JWT_SECRET);
        res.json(token);
    }
}));
exports.default = router;
