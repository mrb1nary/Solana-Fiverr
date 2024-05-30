import express from "express";
import userRouter from "./router/user";
import workerRouter from "./router/worker";
import cors from "cors";


const corsOptions ={
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}

const app = express();
app.use(express.json());
app.use(cors(corsOptions))

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);

app.listen(3000)