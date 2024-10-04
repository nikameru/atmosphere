import { Server, Socket } from "socket.io";

import { RoomPool } from "../global/RoomPool";
import {
    handlePlayerConnection,
    handlePlayerDisconnection,
    handlePlayerKick,
    handlePlayerModsChange,
    handlePlayerStatusChange,
    handlePlayerTeamChange
} from "./handlers/events/PlayerEvents";
import {
    handleBeatmapChange,
    handleBeatmapLoadComplete,
    handleChatMessage,
    handleFreeModsSettingChange,
    handleHostChange,
    handleLiveScoreData,
    handleMaxPlayersChange,
    handlePlayBeatmap,
    handleRoomModsChange,
    handleRoomNameChange,
    handleRoomPasswordChange,
    handleScoreSubmission,
    handleSkipRequest,
    handleSpeedMultiplierChange,
    handleTeamModeChange,
    handleWinConditionChange
} from "./handlers/events/RoomEvents";
import { Room } from "../structures/Room";
import { SocketUtils } from "../utils/SocketUtils";

const roomPool: RoomPool = RoomPool.getInstance();

export const onRoomConnection: Function = withRoom(handlePlayerConnection);

// Called upon connection
export function attachListeners(socket: Socket): void {
    registerEventListener(socket, "disconnect", handlePlayerDisconnection);
    registerEventListener(socket, "beatmapChanged", handleBeatmapChange);
    registerEventListener(socket, "hostChanged", handleHostChange);
    registerEventListener(socket, "playerKicked", handlePlayerKick);
    registerEventListener(socket, "playerModsChanged", handlePlayerModsChange);
    registerEventListener(socket, "roomModsChanged", handleRoomModsChange);
    registerEventListener(socket, "speedMultiplierChanged", handleSpeedMultiplierChange);
    registerEventListener(socket, "freeModsSettingChanged", handleFreeModsSettingChange);
    registerEventListener(socket, "playerStatusChanged", handlePlayerStatusChange);
    registerEventListener(socket, "teamModeChanged", handleTeamModeChange);
    registerEventListener(socket, "winConditionChanged", handleWinConditionChange);
    registerEventListener(socket, "teamChanged", handlePlayerTeamChange);
    registerEventListener(socket, "roomNameChanged", handleRoomNameChange);
    registerEventListener(socket, "maxPlayersChanged", handleMaxPlayersChange);
    registerEventListener(socket, "playBeatmap", handlePlayBeatmap);
    registerEventListener(socket, "chatMessage", handleChatMessage);
    registerEventListener(socket, "liveScoreData", handleLiveScoreData);
    registerEventListener(socket, "beatmapLoadComplete", handleBeatmapLoadComplete);
    registerEventListener(socket, "roomPasswordChanged", handleRoomPasswordChange);
    registerEventListener(socket, "beatmapLoadComplete", handleBeatmapLoadComplete);
    registerEventListener(socket, "skipRequested", handleSkipRequest);
    registerEventListener(socket, "scoreSubmission", handleScoreSubmission);
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
        const roomId: number = SocketUtils.getRoomId(socket);
        const room = roomPool.getRoom(roomId);

        if (!room) {
            socket.emit("error", "Cannot find the room.");
            return console.log(`[withRoom] Cannot find the room ${roomId}!`);
        }

        handler(socket, room, ...args);
    };
}