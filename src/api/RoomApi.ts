import { Server, Socket } from "socket.io";

import { RoomPool } from "../global/RoomPool";
import { 
    handleBeatmapChange,
    handleBeatmapLoadComplete,
    handleChatMessage,
    handleHostChange,
    handleLiveScoreData,
    handlePlayBeatmap,
    handlePlayerKick,
    handlePlayerModsChange,
    handlePlayerStatusChanged,
    handleRoomConnection,
    handleRoomDisconnection,
    handleRoomModsChange
} from "./handlers/events/RoomEvents";
import { Room } from "../structures/Room";
import { getRoomId } from "../utils/SocketUtils";
import { RoomServerClientEvents } from "./handlers/events/IRoomEvents";

const roomPool: RoomPool = RoomPool.getInstance();

export const onRoomConnection: Function = withRoom(handleRoomConnection);

export function attachListeners(socket: Socket): void {
    registerEventListener(socket, "disconnect", handleRoomDisconnection);
    registerEventListener(socket, "beatmapChanged", handleBeatmapChange);
    registerEventListener(socket, "hostChanged", handleHostChange);
    registerEventListener(socket, "playerKicked", handlePlayerKick);
    registerEventListener(socket, "playerModsChanged", handlePlayerModsChange);
    registerEventListener(socket, "playerStatusChanged", handlePlayerStatusChanged);
    registerEventListener(socket, "roomModsChanged", handleRoomModsChange);
    registerEventListener(socket, "playBeatmap", handlePlayBeatmap);
    registerEventListener(socket, "chatMessage", handleChatMessage);
    registerEventListener(socket, "liveScoreData", handleLiveScoreData);
    registerEventListener(socket, "beatmapLoadComplete", handleBeatmapLoadComplete);
}

export function emitToRoom(
    io: Server, socket: Socket, room: string,
    event: string, ...args: any[]
) {
    io.of(socket.nsp.name)
        .to(room)
        .emit(event, args);
}

function registerEventListener(
    socket: Socket, event: string, 
    handler: (socket: Socket, room: Room, ...args: any[]) => void
): void {
    socket.on(event, (...args: any[]) => withRoom(handler)(socket, ...args));
}

function withRoom(
    handler: (socket: Socket, room: Room, ...args: any[]) => void
): (socket: Socket, ...args: any[]) => void {
    return (socket: Socket, ...args: any[]) => {
        const roomId: number = getRoomId(socket);
        const room = roomPool.getRoom(roomId);

        if (!room) {
            socket.emit("error", "Cannot find the room.");
            return console.log(`[withRoom] Cannot find the room ${roomId}!`);
        }

        handler(socket, room, ...args);
    };
}

// export function attachRoomToSocket(socket: Socket, next: (socket: Socket, err?: any) => void) {
//     console.log(`[attachRoomToSocket] Attaching room to socket...`);
//     const roomId: number = Number(
//         socket.nsp.name.slice(socket.nsp.name.lastIndexOf("/") + 1)
//     );
//     const room = roomPool.getRoom(roomId);

//     if (!room) {
//         console.log(`[attachRoomToSocket] Cannot find the room ${roomId}!`);
//         socket.emit("error", "Cannot find the room.");

//         return next(socket, new Error("Cannot find the room."));
//     }

//     (socket as any).room = room;
//     next(socket);
// }
