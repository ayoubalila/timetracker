# CLAUDE.md — TimeTracker Project

## What is this project?

A full-stack time-tracking web application for individuals (students, freelancers, researchers). Users register, log in, and track time spent on hierarchical projects. Tasks can be started/stopped in real time or added/edited manually. The app provides day/week/month overviews and aggregates time across project hierarchies. See `docs/final-project-part-1.md` for the full requirements spec.

## Reference documents

- `docs/final-project-part-1.md` — project requirements (read before implementing any feature)
- `lectures/02-requirements.md` — user story and acceptance-criteria format
- `lectures/03-prototyping.md` — architecture patterns (MVC, REST, repository)
- `lectures/04-coding.md` — coding workflow: plan → generate → verify → refine
- `lectures/05-testing.md` — test hierarchy, coverage targets, mutation testing
- `lectures/06-development-processes.md` — CI, linting, code review process
- `lectures/07-system-testing.md` — Playwright E2E testing setup
- `PLANNING.md` — architecture, domain model, UI screens
- `TASKS.md` — milestones and task breakdown

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Huge LLM training data, fast dev server, strong typing |
| UI library | shadcn/ui + Tailwind CSS | Accessible components, no runtime overhead |
| State / data | TanStack Query v5 | Server-state caching, background refresh for live timer |
| Routing | React Router v6 | Standard SPA routing |
| Backend | Kotlin + Spring Boot 3.x | JVM required; Kotlin reduces boilerplate vs Java |
| ORM | Spring Data JPA + Hibernate | Native Spring integration, easy schema evolution |
| Database (prod) | PostgreSQL 16 (Docker) | Production-grade, runs locally via Docker Compose |
| Database (test) | H2 in-memory | Fast unit/integration tests, no Docker dependency |
| Auth | Spring Security + JWT (jjwt) | Stateless, works across browser restarts |
| Build | Gradle (backend), npm/Vite (frontend) | Standard tools available in grading environment |
| E2E tests | Playwright (TypeScript) | First-class browser automation, Playwright skills available |
| Unit tests BE | JUnit 5 + Mockito + Spring Boot Test | Standard JVM testing stack |
| Unit tests FE | Vitest + Testing Library | Co-located with Vite, fast |
| CI | GitHub Actions | Integrated with GitHub classroom repo |
| Containers | Docker Compose | Required by spec; runs app + PostgreSQL together |

## Project structure

```
/
├── backend/                  # Spring Boot / Kotlin
│   ├── src/main/kotlin/...
│   │   ├── config/           # Spring Security, CORS, JWT config
│   │   ├── controller/       # REST controllers (@RestController)
│   │   ├── service/          # Business logic
│   │   ├── repository/       # Spring Data JPA repositories
│   │   ├── model/            # JPA entities
│   │   └── dto/              # Request/response DTOs
│   ├── src/test/kotlin/...
│   │   ├── unit/             # Service-layer unit tests (Mockito)
│   │   ├── integration/      # Repository + controller tests (H2)
│   │   └── system/           # Playwright E2E tests (@Tag("SystemTest"))
│   └── build.gradle.kts
├── frontend/                 # React / TypeScript / Vite
│   ├── src/
│   │   ├── api/              # Typed fetch wrappers (one file per domain)
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level page components
│   │   ├── hooks/            # Custom React hooks
│   │   └── types/            # Shared TypeScript types
│   ├── src/test/             # Vitest + Testing Library tests
│   └── vite.config.ts
├── docker-compose.yml        # PostgreSQL + backend + frontend (prod)
├── docker-compose.test.yml   # PostgreSQL only (for local integration tests)
├── CLAUDE.md                 # This file
├── PLANNING.md
├── TASKS.md
├── README.md
└── WHOAMI.txt
```

## Build and test commands

```bash
# Backend
cd backend
./gradlew build                  # compile + unit tests
./gradlew test                   # unit + integration tests
./gradlew test -t SystemTest     # E2E tests only (needs running app)
./gradlew jacocoTestReport       # coverage report

# Frontend
cd frontend
npm install
npm run dev                      # dev server on :5173
npm run build                    # production build into dist/
npm run test                     # Vitest unit tests
npm run coverage                 # coverage report
npm run lint                     # ESLint

# Full stack (Docker)
docker compose up --build        # starts PostgreSQL + backend + frontend
docker compose down
```

## Conventions

### Commit messages
```
<type>(<scope>): <short description>

Types: feat, fix, refactor, test, ci, docs, chore
Examples:
  feat(auth): add JWT refresh token endpoint
  fix(timer): prevent negative duration when editing start time
  test(project): add integration tests for hierarchy aggregation
```

### Branch and PR naming
- Branch: `feature/<issue-number>-short-description` or `fix/<issue-number>-short-description`
- One PR per issue; link PRs to issues with `Closes #<n>` in the PR description
- All PRs must pass CI before merge

### Code style
- Kotlin: ktlint formatting (enforced via Gradle plugin)
- TypeScript: ESLint + Prettier (enforced via pre-commit hook and CI)
- No `any` types in TypeScript — use proper interfaces from `src/types/`
- DTOs are separate from JPA entities; never expose entities directly via REST
- Repository methods only do data access; business logic lives in services
- Controllers are thin: validate input → call service → return DTO

### Security rules
- Passwords hashed with BCrypt (strength ≥ 12)
- All endpoints except `/api/auth/**` require a valid JWT
- User data is always scoped to the authenticated user (never trust client-supplied user IDs)
- Validate all user input at the controller layer using Bean Validation (`@Valid`)
- Parameterized queries only — no string-concatenated HQL/SQL

### Testing rules
- 90% line coverage required for both backend and frontend
- Every new feature needs: unit tests for the service, integration test for the controller, and at least one E2E test for the happy path
- System tests use a dedicated test database; never run against production data
- Tests must be deterministic — no `Thread.sleep()`, use `waitForCondition` in Playwright

## Before every git push

Always run these commands before pushing to avoid CI failures:

```bash
cd backend && ./gradlew ktlintFormat --no-daemon
cd ../frontend && npm run lint -- --fix
```

## What NOT to do

- Never expose entity classes directly in REST responses — always map to DTOs
- Never commit `.env` files, secrets, or application-local.properties with real credentials
- Never skip `@Valid` on controller method parameters that accept user input
- Never delete or modify the database schema manually — use Flyway migrations
- Never use `git push --force` on main
- Never hardcode user IDs or assume a specific user — always derive from JWT principal
- Do not add features beyond the current issue scope
