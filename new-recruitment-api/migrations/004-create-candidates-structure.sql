CREATE TABLE Candidate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    experience INTEGER NOT NULL,
    notes TEXT,
    recruitmentStatus TEXT CHECK(recruitmentStatus IN ('nowy', 'w trakcie rozmów', 'zaakceptowany', 'odrzucony')) NOT NULL,
    consentDate DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CandidateJobOffer (
    candidateId INTEGER NOT NULL,
    jobOfferId INTEGER NOT NULL,
    PRIMARY KEY (candidateId, jobOfferId),
    FOREIGN KEY (candidateId) REFERENCES Candidate(id) ON DELETE CASCADE,
    FOREIGN KEY (jobOfferId) REFERENCES JobOffer(id) ON DELETE CASCADE
);