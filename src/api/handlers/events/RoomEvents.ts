import { Socket } from "socket.io";

import * as Config from "../../../global/Config";
import { Room } from "../../../structures/Room";
import { RoomPlayer } from "../../../structures/RoomPlayer";
import { RoomStatus } from "../../../enums/RoomStatus";
import { io } from "../../../index";
import { attachListeners } from "../../RoomApi";
import { PlayerStatus } from "../../../enums/PlayerStatus";
import { LiveScoreData } from "../../../structures/LiveScoreData";
import { TeamMode } from "../../../enums/TeamMode";
import { WinCondition } from "../../../enums/WinCondition";
import { RoomTeam } from "../../../enums/RoomTeam";
import { Beatmap } from "../../../structures/Beatmap";
import { ScoreSubmission } from "../../../structures/ScoreSubmussion";

// TODO: organise this mess, remove duplicate code

export async function handleRoomConnection(socket: Socket, room: Room) {
    if (socket.handshake.auth.version < Config.MULTIPLAYER_VERSION) {
        console.log(
            "[handleRoomConnection] Client multiplayer version mismatch!\n",
             socket.handshake.auth
        );

        /*return*/ socket.emit("error", "Update the game to use multiplayer features.");
    }
    
    // Check password if the room is locked
    if (room.isLocked) {
        if (socket.handshake.auth.password !== room.password) {
            console.log("[handleRoomConnection] Wrong password!", socket.handshake.auth);
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
        console.log("[handleRoomConnection] Assigned host session id in room", room.id, "to", roomPlayer.id);
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

export function handleRoomDisconnection(socket: Socket, room: Room) {
    const player = room.players.get(socket.id);

    if (!player) {
        return console.log("[handleRoomDisconnection] Player not found in room", room.id);
    }
    room.players.delete(socket.id);

    if (room.players.size === 0) {
        // If the room is empty, it is destroyed
        room.destroy();

        return console.log("[handleRoomDisconnection] Destroyed room", room.id, "as it is empty.");
    } else if (player.id === room.host.id) {
        // If the host leaves, new host is picked
        const newHost = Array.from(room.players.values()).at(0);
        if (!newHost) {
            return console.log("[handleRoomDisconnection] Cannot fetch new host in room", room.id);
        }
        room.host = newHost;

        console.log("[handleRoomDisconnection] Picked new host in room", room.id, "- uid", newHost.id);
    } else {
        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("playerLeft", player.id.toString());

        console.log("[handleRoomDisconnection] Emitted: player", player.id, "left the room", room.id);
    }
}


export async function handleBeatmapChange(socket: Socket, room: Room, beatmapData: Record<string, any>) {
    if (room.status === RoomStatus.PLAYING) {
        console.log("[handleBeatmapChange] Attempt to change the beatmap while the match isn\'t over in room", room.id);
        return socket.emit("error", "Cannot change the beatmap while somebody is playing.");
    }

    // TODO: Maybe should make a dto for beatmap data or something :p
    const beatmap: Beatmap = new Beatmap(
        beatmapData.md5,
        beatmapData.title,
        beatmapData.artist,
        beatmapData.creator,
        beatmapData.version
    );

    // No beatmap data means the host is in the changing process
    if (!beatmap.md5) {
        room.status = RoomStatus.CHANGING_BEATMAP;

        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("beatmapChanged", null);

        //console.log(socket.id, socket.rooms, room.id.toString());
        console.log("[handleBeatmapChange] Emitted beatmap changing in room", room.id);
    } else {
        // Fetch beatmap set id so the client can download the beatmap
        await beatmap.fetchBeatmapSetId();
        room.beatmap = beatmap;

        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("beatmapChanged", {
                md5: beatmap.md5,
                title: beatmap.title,
                artist: beatmap.artist,
                creator: beatmap.creator,
                version: beatmap.version,
                beatmapSetId: beatmap.beatmapSetId
            });

        // Setting room status back
        room.status = RoomStatus.IDLE;
        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("roomStatusChanged", room.status);

        console.log("[handleBeatmapChange] Beatmap changed to", beatmap.md5, "in room", room.id);
    }
}

export function handleHostChange(socket: Socket, room: Room, uid: string) {
    if (socket.id !== room.host.sessionId) {
        console.log("[handleHostChange] Attempt to change room host by a non-host in room", room.id);
        return socket.emit("error", "Only room host is allowed to transfer host.");
    }

    const newHost = Array.from(room.players.values())
        .find((player: RoomPlayer) => player.id === Number(uid));
    if (!newHost) {
        console.log("[handleHostChange] Target host not found in room", room.id);
        return socket.emit("error", "Cannot find the player to transfer the host to.");
    }

    room.host = newHost;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("hostChanged", room.host.id.toString());

    console.log("[handleHostChange] Host changed to", newHost.id, "in room", room.id);
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

export function handleRoomModsChange(socket: Socket, room: Room, mods: string) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleRoomModsChange] Attempt to change room mods by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room mods.");
    }

    room.mods.mods = mods;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("roomModsChanged", mods);

    console.log(`[handleRoomModsChange] Room mods changed in room ${room.id} to`, mods);
}

export function handleSpeedMultiplierChange(socket: Socket, room: Room, multiplier: number) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleSpeedMultiplierChange] Attempt to change room settings by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room settings.");
    }

    room.mods.speedMultiplier = multiplier;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("speedMultiplierChanged", multiplier);

    console.log("[handleSpeedMultiplierChange] Changed speed multiplier to", multiplier, "in room", room.id);
}

export function handleFreeModsSettingChange(socket: Socket, room: Room, isFreeMod: boolean) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleFreeModsSettingChange] Attempt to change room settings by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room settings.");
    }

    room.gameplaySettings.isFreeMod = isFreeMod;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("freeModsSettingChanged", isFreeMod);

    console.log("[handleFreeModsSettingChange] Changed free mods to", isFreeMod, "in room", room.id);
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

export function handleTeamModeChange(socket: Socket, room: Room, mode: TeamMode) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleTeamModeChange] Attempt to change room settings by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room settings.");
    }

    room.teamMode = mode;
    if (mode === TeamMode.HEAD_TO_HEAD) {
        for (let player of room.players.values()) {
            player.team = null;
        }
    }
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("teamModeChanged", mode);

    console.log("[handleTeamModeChange] Changed team mode to", mode, "in room", room.id);
}

export function handleWinConditionChange(socket: Socket, room: Room, condition: WinCondition) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleWinConditionChange] Attempt to change room settings by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room settings.");
    }

    room.winCondition = condition;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("winConditionChanged", condition);

    console.log("[handleWinConditionChange] Changed win condition to", condition, "in room", room.id);
}

export function handleTeamChange(socket: Socket, room: Room, team: RoomTeam) {
    if (room.teamMode !== TeamMode.TEAM_VS_TEAM) {
        console.log("[handleTeamChange] Attempt to change team in a head-to-head room", room.id);
        return socket.emit("error", "Cannot change team in a head-to-head room.");
    }

    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handleTeamChange] Player not found in room", room.id);
        return socket.emit("error", "Cannot find the player to change team.");
    }

    player.team = team;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("teamChanged", player.id.toString(), team);

    console.log("[handleTeamChange] Changed player", player.id, "team in room", room.id);
}

export function handleRoomNameChange(socket: Socket, room: Room, name: string) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleRoomNameChange] Attempt to change room settings by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room settings.");
    }

    room.name = name;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("roomNameChanged", name);

    console.log("[handleRoomNameChange] Changed room name to", name, "in room", room.id);
}

export function handleMaxPlayersChange(socket: Socket, room: Room, maxPlayers: number) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleMaxPlayersChange] Attempt to change room settings by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room settings.");
    }

    room.maxPlayers = maxPlayers;
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("maxPlayersChanged", maxPlayers);

    console.log("[handleMaxPlayersChange] Changed max players to", maxPlayers, "in room", room.id);
}

export function handlePlayBeatmap(socket: Socket, room: Room) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handlePlayBeatmap] Attempt to start match by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to start matches.");
    }
    
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("playBeatmap");

    console.log("[handlePlayBeatmap] Emitted match start in room", room.id);
}

export function handleChatMessage(socket: Socket, room: Room, message: string) {
    // Chat filtering, message limiting may be implemented here later (if needed)
    const uid: number | undefined = room.players.get(socket.id)?.id;

    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("chatMessage", uid?.toString() ?? "undefined", message);

    console.log(`[handleChatMessage] Sent ${socket.id}\'s message ${message} in room`, room.id);
}

export function handleLiveScoreData(socket: Socket, room: Room, data: LiveScoreData) {
    if (room.status !== RoomStatus.PLAYING) {
        console.log("[handleLiveScoreData] Room", room.id, "isn\'t in the playing state");
        return socket.emit("error", "No match going on in the room.");
    }

    data.username = room.players.get(socket.id)?.username ?? "undefined";

    // Probably should change to sending everything at once every 3 seconds 
    io.of(socket.nsp.name)
        .to(room.id.toString())
        .emit("liveScoreData", [data]);

    //console.log("[handleLiveScoreData] Sent score data", data, "in room", room.id);
}

export function handleRoomPasswordChange(socket: Socket, room: Room, password?: string) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleRoomPasswordChange] Attempt to change room settings by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room settings.");
    }

    room.password = password ?? null;
    // If password is null, the room is unlocked
    room.isLocked = password ? true : false;

    console.log("[handleRoomPasswordChange] Changed room password to", password, "in room", room.id);
}

export function handleBeatmapLoadComplete(socket: Socket, room: Room) {
    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handleBeatmapLoadComplete] Player not found in room", room.id);
        return socket.emit("error", "Cannot find the player.");
    }

    console.log(`[handleBeatmapLoadComplete] ${player.id} has loaded beatmap in room`, room.id);
    room.playersLoaded.add(player);

    // If every client has loaded the beatmap, emit match start
    if (room.hasEveryoneLoaded()) {
        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("allPlayersBeatmapLoadComplete");

        room.status = RoomStatus.PLAYING;
        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("roomStatusChanged", room.status);

        console.log(`[handleBeatmapLoadComplete] Emitted gameplay start in room`, room.id);
    }
}

export function handleSkipRequest(socket: Socket, room: Room) {
    const player = room.players.get(socket.id);
    if (!player) {
        console.log("[handleSkipRequest] Player not found in room", room.id);
        return socket.emit("error", "Cannot find the player.");
    }

    console.log(`[handleSkipRequest] ${player.id} has voted to skip in room`, room.id);
    room.playersSkipped.add(player);

    // If every client has voted for skip, perform it
    if (room.hasEveryoneSkipped()) {
        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("allPlayersSkipRequested");

        console.log(`[handleSkipRequest] Emitted beatmap skip in room`, room.id);
    }
}

export function handleScoreSubmission(socket: Socket, room: Room, submission: ScoreSubmission) {
    if (room.submittedScores.find(score => score.username === submission.username)) {
        console.log("[handleScoreSubmission] Player", socket.id, "already submitted score in room", room.id);
        return socket.emit("error", "Score already submitted.");
    }

    console.log(`[handleScoreSubmission] ${socket.id} submitted score in room`, room.id);
    room.submittedScores.push(submission);

    // If every client has submitted, proceed to the match end
    if (room.hasEveryoneSubmitted()) {
        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("allPlayersScoreSubmitted", room.submittedScores);

        // Reset room after match end
        room.reset();
        room.status = RoomStatus.IDLE;
        io.of(socket.nsp.name)
            .to(room.id.toString())
            .emit("roomStatusChanged", room.status);

        console.log(`[handleScoreSubmission] Match ended in room`, room.id);
    }
}
