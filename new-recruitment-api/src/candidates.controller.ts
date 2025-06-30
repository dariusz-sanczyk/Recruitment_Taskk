import { Request, Response, Router } from "express";
import { Database } from "sqlite";
import axios from "axios";

export class CandidatesController {
    readonly router = Router();

    constructor(private readonly db: Database) {
        this.router.get('/candidates', this.getAll.bind(this));
        this.router.post('/candidates', this.create.bind(this));
    }

    async getAll(req: Request, res: Response) {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;

        const total = await this.db.get<{ count: number }>(
            "SELECT COUNT(*) as count FROM Candidate"
        );
        const candidates = await this.db.all(
            "SELECT * FROM Candidate LIMIT ? OFFSET ?",
            limit,
            offset
        );

        for (const candidate of candidates) {
            const jobOffers = await this.db.all(
                `SELECT JobOffer.* FROM JobOffer
                 JOIN CandidateJobOffer ON JobOffer.id = CandidateJobOffer.jobOfferId
                 WHERE CandidateJobOffer.candidateId = ?`,
                candidate.id
            );
            candidate.jobOffers = jobOffers;
        }

        res.json({ data: candidates, total: total?.count ?? 0, page });
    }

    async create(req: Request, res: Response) {
        const {
            firstName,
            lastName,
            email,
            phone,
            experience,
            notes,
            recruitmentStatus,
            consentDate,
            jobOfferIds
        } = req.body;

        if (!jobOfferIds || !Array.isArray(jobOfferIds) || jobOfferIds.length === 0) {
            return res.status(400).json({
                error: "Kandydat musi mieć przypisaną co najmniej jedną ofertę pracy."
            });
        }

        const errors: string[] = [];
        if (!firstName) errors.push("Imię jest wymagane.");
        if (!lastName) errors.push("Nazwisko jest wymagane.");
        if (!email) errors.push("Adres e-mail jest wymagany.");
        if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push("Nieprawidłowy format adresu e-mail.");
        if (!phone) errors.push("Numer telefonu jest wymagany.");
        if (experience === undefined || experience === null) errors.push("Lata doświadczenia są wymagane.");
        if (!notes) errors.push("Dodatkowe notatki rekrutera są wymagane.");
        if (!recruitmentStatus) {
            errors.push("Status rekrutacji jest wymagany.");
        } else if (!["nowy", "w trakcie rozmów", "zaakceptowany", "odrzucony"].includes(recruitmentStatus)) {
            errors.push("Nieprawidłowy status rekrutacji.");
        }
        if (!consentDate) errors.push("Data wyrażenia zgody na udział w rekrutacji jest wymagana.");

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        try {
            await this.db.run("BEGIN");

            const result = await this.db.run(
                `INSERT INTO Candidate 
                (firstName, lastName, email, phone, experience, notes, recruitmentStatus, consentDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                firstName,
                lastName,
                email,
                phone,
                experience,
                notes,
                recruitmentStatus,
                consentDate
            );

            const candidateId = result.lastID;

            for (const jobOfferId of jobOfferIds) {
                await this.db.run(
                    `INSERT INTO CandidateJobOffer (candidateId, jobOfferId)
                     VALUES (?, ?)`,
                    candidateId,
                    jobOfferId
                );
            }

            // LEGACY API
            try {
                await axios.post(
                    'http://localhost:4040/candidates',
                    {
                        firstName,
                        lastName,
                        email
                    },
                    {
                        headers: {
                            'x-api-key': '0194ec39-4437-7c7f-b720-7cd7b2c8d7f4'
                        }
                    }
                );
            } catch (legacyError: any) {
                console.warn("Legacy API error:", legacyError.response?.data || legacyError.message);
            }

            await this.db.run("COMMIT");

            res.status(201).json({ id: candidateId });
        } catch (err: any) {
            await this.db.run("ROLLBACK");

            if (err.code === "SQLITE_CONSTRAINT") {
                return res.status(409).json({ error: "E-mail musi być unikalny." });
            }

            res.status(500).json({ error: err.message });
        }
    }
}
