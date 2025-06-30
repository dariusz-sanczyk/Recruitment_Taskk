import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export const setupDb = async () => {
    const db = await open({
        filename: ":memory:",
        driver: sqlite3.Database,
    });

    const migrationsDir = "./migrations";
    const files = readdirSync(migrationsDir).filter(file => file.endsWith(".sql"));
    files.sort();

    for (const file of files) {
        const sql = readFileSync(join(migrationsDir, file), "utf-8");
        await db.exec(sql);
    }

    return db;
};