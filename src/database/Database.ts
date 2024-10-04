import pg, { QueryResult } from "pg";

const { Pool } = pg;

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
    database: "atmospheredb"
});

export async function initialize(): Promise<void> {
    // Create necessary tables if they aren"t present
    await query(
        `
        CREATE TABLE IF NOT EXISTS maps (
            id SERIAL PRIMARY KEY,
            set_id INTEGER,
            artist TEXT,
            title TEXT,
            version TEXT,
            creator TEXT,
            last_update INTEGER,
            total_length INTEGER,
            max_combo INTEGER,
            status INTEGER,
            mode INTEGER,
            bpm REAL,
            cs REAL,
            od REAL,
            ar REAL,
            hp REAL,
            stars REAL,
            md5 TEXT
        );
        
        CREATE TABLE IF NOT EXISTS scores (
            id SERIAL PRIMARY KEY,
            status INTEGER NOT NULL,
            beatmap_id INTEGER,
            beatmap_hash TEXT NOT NULL,
            player_id INTEGER NOT NULL,
            timestamp INTEGER,
            device_id TEXT,
            score INTEGER,
            pp REAL DEFAULT 0,
            max_combo INTEGER,
            full_combo BOOLEAN,
            mods TEXT,
            rank INTEGER,
            accuracy REAL,
            grade TEXT,
            hit300 INTEGER,
            hit_geki INTEGER,
            hit100 INTEGER,
            hit_katsu INTEGER,
            hit50 INTEGER,
            hit_miss INTEGER
        );

        CREATE TABLE IF NOT EXISTS stats (
            id SERIAL PRIMARY KEY,
            rank INTEGER DEFAULT 0,
            pp REAL DEFAULT 0,
            accuracy REAL DEFAULT 100.0,
            total_score INTEGER DEFAULT 0,
            ranked_score INTEGER DEFAULT 0,
            playcount INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            prefix TEXT,
            username TEXT,
            username_safe TEXT,
            password_hash TEXT,
            device_id TEXT,
            sign TEXT,
            avatar_id TEXT,
            custom_avatar TEXT,
            email TEXT,
            email_hash TEXT,
            account_status INTEGER DEFAULT 0,
            account_created INTEGER,
            last_login INTEGER
        );
        `
    );
} 

export async function query(
    text: string,
    params?: any[]
): Promise<QueryResult> {
    return await pool.query(text, params);
}

process.on("exit", async () => {
    await pool.end();
});
