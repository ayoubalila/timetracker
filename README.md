# TimeTracker

A full-stack time-tracking web application for individuals — students, freelancers, and researchers — to track time spent on hierarchical projects.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 |
| Backend | Kotlin + Spring Boot 3.5 |
| Database | PostgreSQL 16 (prod) / H2 (tests) |
| Auth | JWT (stateless) |
| Container | Docker + Docker Compose |

---

## Prerequisites

| Tool | Version |
|------|---------|
| JDK | 21 or 25 |
| Node.js | 24 LTS or newer |
| npm | 10+ (bundled with Node 24) |
| Docker + Docker Compose | any recent version |

---

## Running the Application (Docker Compose)

This is the recommended way for grading and deployment.

```bash
# 1. Copy environment file and adjust secrets if desired
cp .env.example .env

# 2. Build and start PostgreSQL + backend
docker compose up --build

# 3. The application is now available at:
#    http://localhost:8080
```

To stop:

```bash
docker compose down          # keep database volume
docker compose down -v       # also remove database volume
```

---

## Running Tests

Tests do **not** require Docker — they use H2 in-memory database.

### Backend tests

```bash
cd backend
./gradlew test                  # unit + integration tests (H2)
./gradlew jacocoTestReport      # generates coverage report in build/reports/jacoco/
```

### Frontend tests

```bash
cd frontend
npm install
npm run test                    # Vitest unit tests
npm run coverage                # test + coverage report in coverage/
```

---

## Development Setup (without Docker)

### Backend

```bash
# Start a local PostgreSQL (or use the test compose file):
docker compose -f docker-compose.test.yml up -d

cd backend
./gradlew bootRun \
  --args='--spring.datasource.url=jdbc:postgresql://localhost:5433/timetracker_test \
          --spring.datasource.username=timetracker \
          --spring.datasource.password=timetracker'
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # dev server on http://localhost:5173 (proxies /api → :8080)
```

---

## CI Pipeline

GitHub Actions runs on every push and pull request:

- **Backend**: ktlint → `./gradlew test` → Jacoco coverage (≥ 90%)
- **Frontend**: ESLint → `npm run coverage` (≥ 90%)

---

## Project Structure

```
/
├── backend/          # Spring Boot / Kotlin
├── frontend/         # React / TypeScript / Vite
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example
├── CLAUDE.md         # AI assistant configuration
├── PLANNING.md       # Architecture & design decisions
└── TASKS.md          # Milestones & issue tracking
```

---

## Author

See [WHOAMI.txt](WHOAMI.txt) for submission details.
