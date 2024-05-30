import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = "mrb1nary123";
const JWT_WORKER_SECRET = "mrb1naryworker";

export function authMiddleware(req: Request, res: Response, next: NextFunction){
    const authHeader = req.headers["authorization"] ?? "";

    try{
        const decoded = jwt.verify(authHeader, JWT_SECRET)

        //@ts-ignore
        if(decoded.userId){
            //@ts-ignore
            req.userId = decoded.userId;
            return next();
        }

        else{
            return res.status(403).json({
                message: "You are not logged in!"
            })
        }
    }
    catch(error){
        return res.status(400).json({
            message: `Something went wrong ${error}`
        })
    }
}


export function workerMiddleware(req: Request, res: Response, next: NextFunction){
    const authHeader = req.headers["authorization"] ?? "";

    try{
        const decoded = jwt.verify(authHeader, JWT_WORKER_SECRET)

        //@ts-ignore
        if(decoded.userId){
            //@ts-ignore
            req.userId = decoded.userId;
            return next();
        }

        else{
            return res.status(403).json({
                message: "You are not logged in!"
            })
        }
    }
    catch(error){
        return res.status(400).json({
            message: `Something went wrong ${error}`
        })
    }
}