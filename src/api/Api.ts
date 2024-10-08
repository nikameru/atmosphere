import Router from "express-promise-router";

import { RequestUtils } from "../utils/RequestUtils";
import { login } from "./handlers/routes/account/Login";
import { register } from "./handlers/routes/account/Register";
import { getLeaderboard, getScore } from "./handlers/routes/ranking/Leaderboard";
import { downloadReplay, replayUpload, uploadReplay } from "./handlers/routes/ranking/Replay";
import { submitScore } from "./handlers/routes/ranking/Submit";
import { getRooms, createRoom } from "./handlers/routes/multiplayer/Lobby";

export const api = Router();

// Logging middleware
api.use(RequestUtils.logRequests);

// Login
api.post("/login.php", login);

// Register a new account
api.post("/register.php", register);

// Get top scores for a beatmap (leaderboard)
api.post("/getrank.php", getLeaderboard);

// Get score data by id
api.post("/gettop.php", getScore);

// Download replay
api.get("/upload/:replay", downloadReplay);

// Upload replay
api.post("/upload.php", replayUpload.single("uploadedfile"), uploadReplay);

// Submit score
api.post("/submit.php", submitScore);

// Get a list of multiplayer rooms
api.get("/getrooms", getRooms);

// Create a multiplayer room
api.post("/createroom", createRoom);