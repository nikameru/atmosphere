import { Socket } from "socket.io";

import * as Config from "../../../global/Config";
import { io } from "../../../index";
import { Room } from "../../../structures/Room";
import { PlayerStatus } from "../../../enums/PlayerStatus";
import { attachListeners } from "../../RoomApi";
import { RoomPlayer } from "../../../structures/RoomPlayer";
import { RoomTeam } from "../../../enums/RoomTeam";
import { TeamMode } from "../../../enums/TeamMode";

export async function handlePlayerConnection(socket: Socket, room: Room) {
    if (socket.handshake.auth.version < Config.MULTIPLAYER_VERSION) {
        console.log(
            "[handlePlayerConnection] Client multiplayer version mismatch!\n",
            socket.handshake.auth
        );

        /*return*/ socket.emit("error", "Update the game to use multiplayer features.");
    }

    // Check password if the room is locked
    if (room.isLocked) {
        if (socket.handshake.auth.password !== room.password) {
            console.log("[handlePlayerConnection] Wrong password!", socket.handshake.auth);
            return socket.emit("error", "Wrong password.");
        }
    }

    const roomPlayer: RoomPlayer = new RoomPlayer(
        socket.handshake.auth.uid,
        socket.handshake.auth.username,
        socket.id
    );

    room.players.set(socket.id, roomPlayer);

    // Session id is unknown at the time of room creation, so it needs to be assigned here
    if (roomPlayer.id === room.host.id) {
        console.log("[handlePlayerConnection] Assigned host session id in room", room.id, "to", roomPlayer.id);
        room.host.sessionId = socket.id;
    }

    // Join the corresponding room
    await socket.join(room.id.toString());

    console.log(room.players, socket.handshake.auth, socket.rooms, socket.id);

    // Setup event listeners
    attachListeners(socket);

    // Provide the room data on the initial connection
    socket.emit("initialConnection", {
        id: room.id,
        name: room.name,
        host: {
            uid: room.host.id.toString(),
            username: room.host.username
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
                uid: player.id,
                username: player.username,
                status: player.status,
                team: player.team,
                mods: player.mods
            };
        }),
        playerCount: room.players.size,
        playerNames: Array.from(room.players.values())
            .map(player => player.username)
            .join(", "),
        status: room.status,
        sessionId: socket.id
    });

    // Notify the room about the new player
    socket.to(room.id.toString()).emit("playerJoined", {
        uid: roomPlayer.id.toString(),
        username: roomPlayer.username,
        status: roomPlayer.status,
        team: roomPlayer.team,
        mods: roomPlayer.mods
    });
}

export function handlePlayerDisconnection(socket: Socket, room: Room) {
    const player = room.players.get(socket.id);

    if (!player) {
        return console.log("[handlePlayerDisconnection] Player not found in room", room.id);
    }
    room.players.delete(socket.id);

    if (room.players.size === 0) {
        // If the room is empty, it is destroyed
        room.destroy();

        return console.log("[handlePlayerDisconnection] Destroyed room", room.id, "as it is empty.");
    } else if (player.id === room.host.id) {
        // If the host leaves, new host is picked
        const newHost = Array.from(room.players.values()).at(0);
        if (!newHost) {
            return console.log("[handlePlayerDisconnection] Cannot fetch new host in room", room.id);
        }
        room.host = newHost;

        console.log("[handlePlayerDisconnection] Picked new host in room", room.id, "- uid", newHost.id);
    } else {
        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("playerLeft", player.id.toString());

        console.log("[handlePlayerDisconnection] Emitted: player", player.id, "left the room", room.id);
    }
}

export function handlePlayerKick(socket: Socket, room: Room, uid: string) {
    if (room.host.sessionId !== socket.id) {
        console.log("[handlePlayerKick] Attempt to kick a player by a non-host in room", room.id);
        return socket.emit("error", "Only room host is allowed to kick players.");
    }

    const playerToKick = room.players.get(uid);
    if (!playerToKick) {
        console.log("[handlePlayerKick] Cannot find player in room", room.id);
        return socket.emit("error", "Cannot find the player to kick.");
    }

    // If everything's fine, kick the player
    io.of(socket.nsp.name)
        .in(room.id.toString())
        .fetchSockets()
        .then(sockets => {
            sockets.find(socket => socket.id === playerToKick.sessionId)?.disconnect(true);
        });
    room.players.delete(uid);

    // Finally, notify the room
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("playerKicked", uid);

    console.log("[handlePlayerKick] Player", uid, "kicked from room", room.id);
}

export function handlePlayerStatusChange(socket: Socket, room: Room, status: PlayerStatus) {
    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handlePlayerStatusChange] Player not found in room", room.id);
        return socket.emit("error", "Cannot find the player to change status.");
    }

    player.status = status;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("playerStatusChanged", player.id.toString(), status);

    console.log(`[handlePlayerStatusChange] Player ${player.id} status changed in room ${room.id} to`, status);
}

export function handlePlayerModsChange(socket: Socket, room: Room, mods: string) {
    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handlePlayerModsChange] Player not found in room", room.id);
        return socket.emit("error", "Cannot find the player to change mods.");
    }

    player.mods.mods = mods;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("playerModsChanged", player.id.toString(), mods);

    console.log(`[handlePlayerModsChange] Changed player ${player.id} mods in room ${room.id}:`, mods);
}

export function handlePlayerTeamChange(socket: Socket, room: Room, team: RoomTeam) {
    if (room.teamMode !== TeamMode.TEAM_VS_TEAM) {
        console.log("[handlePlayerTeamChange] Attempt to change team in a head-to-head room", room.id);
        return socket.emit("error", "Cannot change team in a head-to-head room.");
    }

    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handlePlayerTeamChange] Player not found in room", room.id);
        return socket.emit("error", "Cannot find the player to change team.");
    }

    player.team = team;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("teamChanged", player.id.toString(), team);

    console.log("[handlePlayerTeamChange] Changed player", player.id, "team in room", room.id);
}