import { Socket } from "socket.io";

import * as Config from "../../../global/Config";
import { Room } from "../../../structures/Room";
import { RoomPlayer } from "../../../structures/RoomPlayer";
import { RoomStatus } from "../../../enums/RoomStatus";
import { io } from "../../..";
import { attachListeners } from "../../RoomApi";
import { PlayerStatus } from "../../../enums/PlayerStatus";
import { LiveScoreData } from "../../../structures/LiveScoreData";
import { TeamMode } from "../../../enums/TeamMode";
import { WinCondition } from "../../../enums/WinCondition";
import { RoomTeam } from "../../../enums/RoomTeam";

export async function handleRoomConnection(socket: Socket, room: Room) {
    if (socket.handshake.auth.version < Config.MULTIPLAYER_VERSION) {
        console.log(
            "[handleRoomConnection] Client multiplayer version mismatch!\n",
             socket.handshake.auth
        );

        return socket.emit("error", "Update the game to use multiplayer features.");
    }

    const roomPlayer: RoomPlayer = new RoomPlayer(
        socket.handshake.auth.uid,
        socket.handshake.auth.username,
        socket.id
    );

    room.players.set(socket.id, roomPlayer);

    // Session id is unknown at the time of room creation, so it needs to be assigned here
    if (roomPlayer._id === room.host._id) {
        console.log("[handleRoomConnection] Assigned host session id in room", room._id, "to", roomPlayer._id);
        room.host.sessionId = socket.id;
    }

    // Join the corresponding room
    await socket.join(room._id.toString());

    console.log(room.players, socket.handshake.auth, socket.rooms, socket.id);

    // Setup event listeners
    attachListeners(socket);

    // Provide the room data on the initial connection
    socket.emit("initialConnection", {
        id: room._id,
        name: room.name,
        host: {
            uid: room.host._id.toString(),
            username: room.host._username
        },
        maxPlayers: room.maxPlayers,
        isLocked: room.isLocked,
        beatmap: room.beatmap,
        mods: room.mods,
        gameplaySettings: room.gameplaySettings,
        teamMode: room.teamMode,
        winCondition: room.winCondition,
        players: Array.from(room.players.values()).map(player => {
            return {
                uid: player._id,
                username: player._username,
                status: player.status,
                team: player.team,
                mods: player.mods
            };
        }),
        playerCount: room.players.size,
        playerNames: Array.from(room.players.values())
            .map(player => player._username)
            .join(", "),
        status: room.status,
        sessionId: socket.id
    });
}

export function handleRoomDisconnection(socket: Socket, room: Room) {
    const player = room.players.get(socket.id);

    if (!player) {
        return console.log("[handleRoomDisconnection] Player not found in room", room._id);
    }
    room.players.delete(socket.id);

    if (room.players.size === 0) {
        // If the room is empty, it is destroyed
        room.destroy();

        return console.log("[handleRoomDisconnection] Destroyed room", room._id, "as it is empty.");
    } else if (player._id === room.host._id) {
        // If the host leaves, new host is picked
        const newHost = Array.from(room.players.values()).at(0);
        if (!newHost) {
            return console.log("[handleRoomDisconnection] Cannot fetch new host in room", room._id);
        }
        room.host = newHost;

        console.log("[handleRoomDisconnection] Picked new host in room", room._id, "- uid", newHost._id);
    } else {
        io.of(socket.nsp.name)
            .to(room._id.toString())
            .emit("playerLeft", player._id.toString());

        console.log("[handleRoomDisconnection] Emitted: player", player._id, "left the room", room._id);
    }
}


export function handleBeatmapChange(socket: Socket, room: Room, beatmap: Record<string, any>) {
    if (room.status === RoomStatus.PLAYING) {
        console.log("[handleBeatmapChange] Attempt to change the beatmap while the match isn\'t over in room", room._id);
        return socket.emit("error", "Cannot change the beatmap while somebody is playing.");
    }

    // No beatmap data means the host is in the changing process
    if (!beatmap.md5) {
        room.status = RoomStatus.CHANGING_BEATMAP;

        io.of(socket.nsp.name)
            .to(room._id.toString())
            .emit("beatmapChanged", null);

        //console.log(socket.id, socket.rooms, room._id.toString());
        console.log("[handleBeatmapChange] Emitted beatmap changing in room", room._id);
    } else {
        // Setting room status back
        room.status = RoomStatus.IDLE;
        room.beatmap = beatmap;

        io.of(socket.nsp.name)
            .to(room._id.toString())
            .emit("beatmapChanged", room.beatmap);

        console.log("[handleBeatmapChange] Beatmap changed to", beatmap.md5, "in room", room._id);
    }
}

export function handleHostChange(socket: Socket, room: Room, uid: string) {
    if (socket.id !== room.host.sessionId) {
        console.log("[handleHostChange] Attempt to change room host by a non-host in room", room._id);
        return socket.emit("error", "Only room host is allowed to transfer host.");
    }

    const newHost = Array.from(room.players.values())
        .find((player: RoomPlayer) => player._id === Number(uid));
    if (!newHost) {
        console.log("[handleHostChange] Target host not found in room", room._id);
        return socket.emit("error", "Cannot find the player to transfer the host to.");
    }

    room.host = newHost;
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("hostChanged", room.host._id.toString());

    console.log("[handleHostChange] Host changed to", newHost._id, "in room", room._id);
}

export function handlePlayerKick(socket: Socket, room: Room, uid: string) {
    if (room.host.sessionId !== socket.id) {
        console.log("[handlePlayerKick] Attempt to kick a player by a non-host in room", room._id);
        return socket.emit("error", "Only room host is allowed to kick players.");
    }

    const playerToKick = room.players.get(uid);
    if (!playerToKick) {
        console.log("[handlePlayerKick] Cannot find player in room", room._id);
        return socket.emit("error", "Cannot find the player to kick.");
    }

    // If everything's fine, kick the player
    io.of(socket.nsp.name)
        .in(room._id.toString())
        .fetchSockets()
        .then(sockets => {
            sockets.find(socket => socket.id === playerToKick.sessionId)?.disconnect(true);
        });
    room.players.delete(uid);

    // Finally, notify the room
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("playerKicked", uid);

    console.log("[handlePlayerKick] Player", uid, "kicked from room", room._id);
}

export function handlePlayerModsChange(socket: Socket, room: Room, mods: string) {
    console.log("handlePlayerModsChange", mods);
    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handlePlayerModsChange] Player not found in room", room._id);
        return socket.emit("error", "Cannot find the player to change mods.");
    }

    // TODO: fix and type this messy structure later
    player.mods.mods = mods;
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("playerModsChanged", player._id.toString(), mods);

    console.log(`[handlePlayerModsChange] Changed player ${player._id} mods in room ${room._id}: ${mods}`);
}

export function handleRoomModsChange(socket: Socket, room: Room, mods: string) {
    if (room.players.get(socket.id)?._id !== room.host._id) {
        console.log("[handleRoomModsChange] Attempt to change room mods by a non-host in room", room._id);
        return socket.emit("error", "Only host is allowed to change room mods.");
    }

    // TODO: fix and type this messy structure later
    room.mods.mods = mods;
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("roomModsChanged", mods);

    console.log(`[handleRoomModsChange] Room mods changed in room ${room._id} to`, mods);
}

export function handleSpeedMultiplierChange(socket: Socket, room: Room, multiplier: number) {

}

export function handleFreeModsSettingChange(socket: Socket, room: Room, isEnabled: boolean) {

}

export function handlePlayerStatusChanged(socket: Socket, room: Room, status: PlayerStatus) {
    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handlePlayerStatusChanged] Player not found in room", room._id);
        return socket.emit("error", "Cannot find the player to change status.");
    }

    player.status = status;
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("playerStatusChanged", player._id.toString(), status);

    console.log(`[handlePlayerStatusChange] Player ${player._id} status changed in room ${room._id} to`, status);
}

export function handleTeamModeChanged(socket: Socket, room: Room, mode: TeamMode) {
    
}

export function handleWinConditionChanged(socket: Socket, room: Room, condition: WinCondition) {
    
}

export function handleTeamChanged(socket: Socket, room: Room, team: RoomTeam) {
    
}

export function handleRoomNameChanged(socket: Socket, room: Room, name: string) {
    
}

export function handleMaxPlayersChanged(socket: Socket, room: Room, maxPlayers: number) {
    
}

export function handlePlayBeatmap(socket: Socket, room: Room) {
    if (room.players.get(socket.id)?._id !== room.host._id) {
        console.log("[handlePlayBeatmap] Attempt to start match by a non-host in room", room._id);
        return socket.emit("error", "Only host is allowed to start matches.");
    }
    
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("playBeatmap");

    console.log("[handlePlayBeatmap] Emitted match start in room", room._id);
}

export function handleChatMessage(socket: Socket, room: Room, message: string) {
    // Chat filtering, message limiting may be implemented here later (if needed)
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("chatMessage", room.players.get(socket.id)?._username ?? "undefined", message);

    console.log(`[handleChatMessage] Sent ${socket.id}\'s message ${message} in room`, room._id);
}

export function handleLiveScoreData(socket: Socket, room: Room, data: LiveScoreData) {
    if (room.status !== RoomStatus.PLAYING) {
        console.log("[handleLiveScoreData] Room", room._id, "isn\'t in the playing state");
        return socket.emit("error", "No match going on in the room.");
    }

    data.uid = room.players.get(socket.id)?._username ?? "undefined";

    // Probably should change to sending everything at once every 3 seconds 
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("liveScoreData", [data]);

    console.log(`[handleLiveScoreData] Sent score data ${data} in room`, room._id);
}

export function handleRoomPasswordChanged(socket: Socket, room: Room, password: string) {
    
}

export function handleBeatmapLoadComplete(socket: Socket, room: Room) {
    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handleBeatmapLoadComplete] Player not found in room", room._id);
        return socket.emit("error", "Cannot find the player.");
    }

    console.log(`[handleBeatmapLoadComplete] ${player._id} has loaded beatmap in room`, room._id);

    room.addLoadedPlayer(player);
    // If every client has loaded the beatmap, emit match start
    if (room.hasEveryoneLoaded()) {
        io.of(socket.nsp.name)
            .to(room._id.toString())
            .emit("allPlayersBeatmapLoadComplete");

        console.log(`[handleBeatmapLoadComplete] Emitted gameplay start in room`, room._id);
    }
}

export function handleSkipRequested(socket: Socket, room: Room) {
    
}

export function handleScoreSubmission(socket: Socket, room: Room, score: Record<string, any>) {
    
}
