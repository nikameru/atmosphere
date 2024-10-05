import { Socket } from "socket.io";

import { Room } from "../../../structures/Room";
import { RoomPlayer } from "../../../structures/RoomPlayer";
import { RoomStatus } from "../../../enums/RoomStatus";
import { io } from "../../../index";
import { LiveScoreData } from "../../../structures/LiveScoreData";
import { TeamMode } from "../../../enums/TeamMode";
import { WinCondition } from "../../../enums/WinCondition";
import { Beatmap } from "../../../structures/Beatmap";
import { ScoreSubmission } from "../../../structures/ScoreSubmussion";

export async function handleBeatmapChange(socket: Socket, room: Room, beatmapData: Record<string, string>) {
    if (room.status === RoomStatus.PLAYING) {
        console.log("[handleBeatmapChange] Attempt to change the beatmap while the match isn't over in room", room.id);
        return socket.emit("error", "Cannot change the beatmap while somebody is playing.");
    }

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

export function handleTeamModeChange(socket: Socket, room: Room, mode: TeamMode) {
    if (room.players.get(socket.id)?.id !== room.host.id) {
        console.log("[handleTeamModeChange] Attempt to change room settings by a non-host in room", room.id);
        return socket.emit("error", "Only host is allowed to change room settings.");
    }

    room.teamMode = mode;
    if (mode === TeamMode.HEAD_TO_HEAD) {
        for (const player of room.players.values()) {
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

    console.log(`[handleChatMessage] Sent ${socket.id}'s message ${message} in room`, room.id);
}

export function handleLiveScoreData(socket: Socket, room: Room, data: LiveScoreData) {
    if (room.status !== RoomStatus.PLAYING) {
        console.log("[handleLiveScoreData] Room", room.id, "isn't in the playing state");
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
