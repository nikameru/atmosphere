import * as http from "node:http";
import express, { Request, Response } from "express";
import { Server } from "socket.io";

import "dotenv/config";

import * as Config from "./global/Config";
import { api } from "./handlers/api/Api";
import * as db from "./database/Database";
import { onRoomConnection } from "./handlers/api/RoomApi";
import { RoomServerClientEvents, RoomClientServerEvents } from "./handlers/api/events/IRoomEvents";

const app = express();
const server = http.createServer(app);
const io = new Server<
    RoomClientServerEvents,
    RoomServerClientEvents
>(server);
const port: string | number = process.env.ATMOSPHERE_PORT || Config.DEFAULT_PORT;

export { io };

async function bootstrap() {
    await db.initialize();

    server.listen(port, () => {
        console.log(`Running at http://localhost:${port}...`);
    });
}

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
io.of(/^\/multi\/\d+$/).on("connection", onRoomConnection);

bootstrap();