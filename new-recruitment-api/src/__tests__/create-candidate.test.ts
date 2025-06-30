import request from 'supertest';
import { Application } from 'express';
import { setupApp } from '../app';
import { setupDb } from '../db';
import { Database } from 'sqlite';

describe('Create Candidate', () => {
    let app: Application;
    let db: Database;

    beforeAll(async () => {
        db = await setupDb();
        app = await setupApp(db);
    });

    it('should create a new candidate successfully', async () => {
        const jobOffers = await db.all('SELECT id FROM JobOffer LIMIT 1');

        const res = await request(app)
            .post('/candidates')
            .send({
                firstName: "Anna",
                lastName: "Kowalska",
                email: "anna.kowalska@test.com",
                phone: "123-456-789",
                experience: 3,
                notes: "Bardzo dobry kandydat",
                recruitmentStatus: "nowy",
                consentDate: new Date().toISOString(),
                jobOfferIds: [jobOffers[0].id]
            });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
    });

    it('should return 400 for invalid email format', async () => {
        const res = await request(app)
            .post('/candidates')
            .send({
                firstName: "Test",
                lastName: "Email",
                email: "not-an-email",
                phone: "000",
                experience: 1,
                notes: "note",
                recruitmentStatus: "nowy",
                consentDate: new Date().toISOString(),
                jobOfferIds: [1]
            });

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("Nieprawidłowy format adresu e-mail.");
    });

    it('should return 409 if email already exists', async () => {
        const jobOffers = await db.all('SELECT id FROM JobOffer LIMIT 1');

        const candidateData = {
            firstName: "Jan",
            lastName: "Nowak",
            email: "jan.nowak@example.com",
            phone: "987-654-321",
            experience: 5,
            notes: "doświadczony",
            recruitmentStatus: "w trakcie rozmów",
            consentDate: new Date().toISOString(),
            jobOfferIds: [jobOffers[0].id]
        };

        await request(app).post('/candidates').send(candidateData); // first insert

        const res = await request(app).post('/candidates').send(candidateData); // duplicate

        expect(res.status).toBe(409);
        expect(res.body.error).toBe("E-mail musi być unikalny.");
    });

    it('should return 400 if jobOfferIds is missing or empty', async () => {
        const res = await request(app)
            .post('/candidates')
            .send({
                firstName: "Test",
                lastName: "Offerless",
                email: "offerless@example.com",
                phone: "123",
                experience: 2,
                notes: "no job offer",
                recruitmentStatus: "nowy",
                consentDate: new Date().toISOString(),
                jobOfferIds: []
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain("Kandydat musi mieć przypisaną co najmniej jedną ofertę pracy.");
    });

    it('should persist candidate in DB', async () => {
        const jobOffers = await db.all('SELECT id FROM JobOffer LIMIT 1');

        const email = "dbtest@example.com";

        await request(app)
            .post('/candidates')
            .send({
                firstName: "Maria",
                lastName: "Testowa",
                email,
                phone: "000-111-222",
                experience: 1,
                notes: "db test",
                recruitmentStatus: "zaakceptowany",
                consentDate: new Date().toISOString(),
                jobOfferIds: [jobOffers[0].id]
            });

        const candidate = await db.get('SELECT * FROM Candidate WHERE email = ?', email);

        expect(candidate).toBeDefined();
        expect(candidate.firstName).toBe("Maria");
    });
    it('should allow multiple job offers for a candidate', async () => {
        const jobOffers = await db.all('SELECT id FROM JobOffer LIMIT 2');

        const res = await request(app)
            .post('/candidates')
            .send({
                firstName: "Multi",
                lastName: "Offer",
                email: "multi.offer@example.com",
                phone: "111-222-333",
                experience: 4,
                notes: "test multiple offers",
                recruitmentStatus: "nowy",
                consentDate: new Date().toISOString(),
                jobOfferIds: jobOffers.map(j => j.id)
            });

        expect(res.status).toBe(201);

        const offers = await db.all(`
        SELECT * FROM CandidateJobOffer
        WHERE candidateId = ?
    `, res.body.id);

        expect(offers.length).toBe(2);
    });
});
