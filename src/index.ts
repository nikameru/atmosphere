import * as http from "node:http";
import express, { Request, Response, Router } from "express";
import { Server } from "socket.io";

import "dotenv/config";

import * as Config from "./global/Config";
import { api } from "./handlers/api/Api";
import * as db from "./database/Database";
import { RoomServerClientEvents } from "./handlers/api/IRoomEvents";
import { onRoomConnection } from "./handlers/api/RoomApi";
import { Player } from "./structures/Player";
import { Room } from "./structures/Room";

const app = express();
const server = http.createServer(app);
const io = new Server/*<RoomServerClientEvents>*/(server);
const port: string | number = process.env.ATMOSPHERE_PORT || Config.DEFAULT_PORT;

async function startServer() {
    await db.initialize();

    server.listen(port, () => {
        console.log(`Running at http://localhost:${port}...`);
    });
}

app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
app.use("/api", api);

app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to the atmosphere!");
});

io.of(/^\/multi\/\d+$/).on("connection", onRoomConnection);
    
startServer();