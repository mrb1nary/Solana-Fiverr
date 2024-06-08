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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const middleware_1 = require("../middleware");
const dbFunctions_1 = require("../dbFunctions");
const types_1 = require("../types");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = require("bs58");
const web3_js_1 = require("@solana/web3.js");
const router = (0, express_1.Router)();
const connection = new web3_js_1.Connection((_a = process.env.RPC_URL) !== null && _a !== void 0 ? _a : "");
const JWT_WORKER_SECRET = "mrb1naryworker";
const prismaClient = new client_1.PrismaClient();
prismaClient.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
}), {
    maxWait: 5000,
    timeout: 10000,
});
const TOTAL_SUBMISSION = 100;
const TOTAL_DECIMALS = 1000000;
router.post("/payout", middleware_1.workerMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const worker = yield prismaClient.worker.findFirst({
        where: { id: Number(userId) }
    });
    if (!worker) {
        return res.status(403).json({
            message: "User not found"
        });
    }
    const address = worker.address;
    if (worker.pending_amount <= 0) {
        return res.status(200).json({
            message: "You have no balance to withdraw"
        });
    }
    const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
        fromPubkey: new web3_js_1.PublicKey("FFqp5uGm2mvnwmrkT945iQQF3MADzoH6a9rCZAi9xY6Y"),
        toPubkey: new web3_js_1.PublicKey(worker.address),
        lamports: 1000000000 * worker.pending_amount / TOTAL_DECIMALS,
    }));
    // console.log(worker.address)
    // console.log(transaction);
    const secretKey = (0, bs58_1.decode)("22a615BHVywcmw7n2irrRpKztifBWcZjb9Wv2HsmVKBFuQndQV9tPaYmJU3HcJvxBAvCrWb9yQAaKLwkmzij5ew6");
    console.log(secretKey);
    const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
    let signature = "";
    try {
        signature = yield (0, web3_js_1.sendAndConfirmTransaction)(connection, transaction, [keypair]);
    }
    catch (e) {
        console.log(e);
        return res.json({
            message: "Transaction failed"
        });
    }
    console.log(signature);
    yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        yield tx.worker.update({
            where: {
                id: Number(userId)
            },
            data: {
                pending_amount: {
                    decrement: worker.pending_amount
                },
                locked_amount: {
                    increment: worker.pending_amount
                }
            }
        });
        yield tx.payouts.create({
            data: {
                user_id: Number(userId),
                amount: worker.locked_amount,
                signature: signature,
                status: "Processing"
            }
        });
    }));
    res.status(200).json({
        message: "Processing payment",
        amount: worker.pending_amount
    });
    //Add web3 logic here
}));
router.get("/balance", middleware_1.workerMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    const worker = yield prismaClient.worker.findFirst({
        where: {
            id: Number(userId)
        }
    });
    if (!worker) {
        res.status(400).json({
            message: "Couldn't find user ID"
        });
    }
    else {
        res.status(200).json({
            pendingAmount: (worker === null || worker === void 0 ? void 0 : worker.pending_amount) / TOTAL_DECIMALS,
            lockedAmount: worker === null || worker === void 0 ? void 0 : worker.locked_amount
        });
    }
}));
router.post("/submission", middleware_1.workerMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    // @ts-ignore
    const userId = req.userId;
    const parsedBody = types_1.createSubmissionInput.safeParse(req.body);
    if (parsedBody.success) {
        const task = yield (0, dbFunctions_1.getNextTask)(Number(userId));
        if (!task) {
            return res.status(411).json({
                message: "Wrong task ID"
            });
        }
        const amount = (Number(task.amount) / TOTAL_SUBMISSION).toString();
        const submission = yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const existingSubmission = yield tx.submission.findUnique({
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
            const submission = yield tx.submission.create({
                data: {
                    option_id: Number(parsedBody.data.selection),
                    worker_id: Number(userId),
                    task_id: Number(parsedBody.data.taskId),
                    amount: Number(amount)
                }
            });
            yield tx.worker.update({
                where: {
                    id: Number(userId)
                },
                data: {
                    pending_amount: {
                        increment: Number(amount)
                    }
                }
            });
            return submission;
        }));
        const nextTask = (_b = yield (0, dbFunctions_1.getNextTask)(Number(userId))) !== null && _b !== void 0 ? _b : "";
        res.json({
            nextTask,
            amount
        });
    }
    else {
        res.status(411).json({
            message: "Parsing body failed"
        });
    }
}));
router.get("/nextTask", middleware_1.workerMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const parsedBody = types_1.createSubmissionInput.safeParse(req.body);
    const task = yield (0, dbFunctions_1.getNextTask)(Number(userId));
    if (!task) {
        res.status(411).json({
            message: "Out of tasks for now"
        });
    }
    else {
        res.status(200).json({ task });
    }
}));
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { publicKey, signature } = req.body;
    const message = new TextEncoder().encode("Sign in to Solana Fiverr as worker");
    //Verify the singature
    const result = tweetnacl_1.default.sign.detached.verify(message, new Uint8Array(signature.data), new web3_js_1.PublicKey(publicKey).toBytes());
    if (!result) {
        return res.status(401).json({
            message: "Verification failed"
        });
    }
    const existingUser = yield prismaClient.worker.findFirst({
        where: {
            address: publicKey
        }
    });
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({
            userId: existingUser.id
        }, JWT_WORKER_SECRET);
        res.json(token);
    }
    else {
        const user = yield prismaClient.worker.create({
            data: {
                address: publicKey,
                pending_amount: 0,
                locked_amount: 0
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id
        }, JWT_WORKER_SECRET);
        res.json(token);
    }
}));
exports.default = router;
