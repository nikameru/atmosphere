import * as http from "node:http";
import express, { Request, Response } from "express";
import { Server, Socket } from "socket.io";

import "dotenv/config";

import * as Config from "./global/Config";
import { api } from "./api/Api";
import * as db from "./database/Database";
import {
    PlayerServerClientEvents,
    PlayerClientServerEvents
} from "./api/handlers/events/IPlayerEvents"; 
import { 
    RoomServerClientEvents,
    RoomClientServerEvents
} from "./api/handlers/events/IRoomEvents";
import { onRoomConnection } from "./api/RoomApi";

const app = express();
const server = http.createServer(app);
const io = new Server<
    PlayerClientServerEvents & RoomClientServerEvents,
    PlayerServerClientEvents & RoomServerClientEvents
>(server);
const port: string | number = process.env.ATMOSPHERE_PORT || Config.DEFAULT_PORT;

// To broadcast events to certain rooms
export { io };

async function bootstrap() {
    await db.initialize();

    server.listen(port, () => {
        console.log(`Running at http://localhost:${port}...`);
    });
}

// Necessary middlewares for express
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
// Mount request routes
app.use("/api", api);
app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to the atmosphere!");
});

// Listen to socket connections with dynamic namespaces (multiplayer)
io.of(Config.MULTIPLAYER_NAMESPACE).on("connection", (socket: Socket) => {
    onRoomConnection(socket);
});

bootstrap();