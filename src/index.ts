import express, { Request, Response, Router } from "express";
import "dotenv/config";

import { api } from "./routes/Api";
import * as db from "./database/Database";

const server = express();
const port = process.env.ATMOSPHERE_PORT || 80;

async function startServer() {
    await db.initialize();

    server.listen(port, () => {
        console.log(`Running at http://localhost:${port}...`);
    });
}

server.use(express.urlencoded({
    extended: true
}));

server.use("/api", api);

server.get("/", (req: Request, res: Response) => {
    res.send("Welcome to the atmosphere!");
});

startServer();