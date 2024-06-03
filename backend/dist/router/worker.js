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
const client_1 = require("@prisma/client");
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const middleware_1 = require("../middleware");
const dbFunctions_1 = require("../dbFunctions");
const types_1 = require("../types");
const router = (0, express_1.Router)();
const JWT_WORKER_SECRET = "mrb1naryworker";
const prismaClient = new client_1.PrismaClient();
const TOTAL_SUBMISSION = 100;
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
    const txnId = "0x123ne";
    if (worker.pending_amount <= 0) {
        return res.status(200).json({
            message: "You have no balance to withdraw"
        });
    }
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
                signature: txnId,
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
            pendingAmount: worker === null || worker === void 0 ? void 0 : worker.pending_amount,
            lockedAmount: worker === null || worker === void 0 ? void 0 : worker.locked_amount
        });
    }
}));
router.post("/submission", middleware_1.workerMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        const nextTask = (_a = yield (0, dbFunctions_1.getNextTask)(Number(userId))) !== null && _a !== void 0 ? _a : "";
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
    const hardcodedWallet = "FFqp5uGm2mvnwmrkT945iQQF3MADzoH6a9rCZAi9xY6Y";
    const existingUser = yield prismaClient.worker.findFirst({
        where: {
            address: hardcodedWallet
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
                address: hardcodedWallet,
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
