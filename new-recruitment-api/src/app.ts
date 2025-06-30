import express from "express";
import { CandidatesController } from "./candidates.controller";
import { Database } from "sqlite/build";

export const setupApp = async (db: Database) => {
    const app = express();

    app.use(express.json());

    app.use(new CandidatesController(db).router);

    return app;
}
