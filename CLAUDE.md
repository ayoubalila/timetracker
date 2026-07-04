# CLAUDE.md — TimeTracker Project

## What is this project?

A full-stack time-tracking web application for individuals and teams (students, freelancers, researchers). Users register, log in, and track time spent on hierarchical projects. Tasks can be started/stopped in real time or added/edited manually. The app provides day/week/month overviews and aggregates time across project hierarchies. Projects can be shared between users, with task export and timezone support added in Part II. See `docs/final-project-part-1.md` and `docs/final-project-part-2.md` for the full requirements specs.

## Reference documents

- `docs/final-project-part-1.md` — Part I requirements
- `docs/final-project-part-2.md` — Part II requirements (project sharing, export, timezones, custom features)
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
- All endpoints except `POST /api/auth/register` and `POST /api/auth/login` require a valid JWT; Spring Security returns 401 (not 403) for missing/invalid tokens
- User data is always scoped to the authenticated user (never trust client-supplied user IDs)
- **Project access (Part II):** a user may access a project if and only if `project.owner == currentUser` OR a `ProjectMember` row exists — this check must be in `ProjectService`, never skipped
- Only a project's owner can invite or remove members; members have read/write access to tasks only
- Validate all user input at the controller layer using Bean Validation (`@Valid`)
- Parameterized queries only — no string-concatenated HQL/SQL
- Export endpoint must verify project membership before streaming data

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

## Part II — key technical decisions

### Project sharing
- New entity `ProjectMember` (V5 Flyway migration): columns `project_id`, `user_id`, `role VARCHAR(20)`
- Access check helper in `ProjectService`: `project.owner == user OR memberRepository.existsByProjectAndUser(project, user)`
- `ProjectService.getAll()` must UNION owned projects and member projects
- Task creation for a project checks membership, not task ownership
- Shared project task list (`GET /api/projects/{id}/tasks`): returns tasks from all members; supports `?userId=` filter
- Time aggregation CTE: drop `WHERE t.owner_id = :userId` for shared projects; add `GROUP BY t.owner_id` for per-user breakdown

### Export
- Endpoint: `GET /api/projects/{id}/export` — access: owner or member
- Query params: `?month=YYYY-MM` (monthly slice) or omit for all tasks
- Scope: the project AND all its subprojects (recursive)
- Format: CSV; columns: `username`, `project_path`, `description`, `start_time`, `end_time`, `duration_seconds`
- Response: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="export.csv"`
- Running tasks (null `end_time`): include them with `end_time` left blank and `duration_seconds` up to `NOW()`

### Time zones
- New column: `users.timezone VARCHAR(50) NOT NULL DEFAULT 'UTC'` (V6 Flyway migration)
- New endpoint: `PUT /api/auth/timezone` — body `{"timezone": "Europe/Berlin"}`; validate against `ZoneId.of()` on the backend
- Backend stores all timestamps as UTC; no conversion on the backend side
- Frontend converts UTC ISO strings to the user's timezone for display using the browser's `Intl.DateTimeFormat` or a library like `date-fns-tz`
- Frontend pre-fills task start time in the user's timezone when opening the create-task form
- User's timezone is returned as part of the profile/auth response so the frontend can use it without a separate request

### Custom feature 1 — Task tags (M9A)
- New entity `Tag` (id UUID, name VARCHAR(50), color VARCHAR(7), owner_id FK → users); new join table `task_tag` (tag_id FK, task_id FK)
- Tags are **user-scoped**: each user owns their own tags; tags are never shared across users even on shared projects
- Tag CRUD endpoints: `GET /api/tags`, `POST /api/tags`, `DELETE /api/tags/{id}`
- `CreateTaskRequest` and `UpdateTaskRequest` accept `tagIds: List<UUID>`; `TaskResponse` includes `tags: List<TagResponse>`
- Filter support: `?tagId=UUID` query param on `GET /api/tasks`, all `GET /api/overview/*` endpoints, and `GET /api/projects/{id}/tasks`
- Export: add `tags` column (comma-separated names) to the CSV produced by `GET /api/projects/{id}/export`
- Flyway V7: create `tag` table, then `task_tag` join table
- Frontend: multi-select tag picker chip component in TaskForm; tag-filter dropdown on Dashboard and shared project task list

### Custom feature 2 — Project time budgets (M9B)
- Two new nullable columns on `project` table: `budget_seconds BIGINT`, `budget_period VARCHAR(20)` (values: `TOTAL`, `WEEKLY`, `MONTHLY`; null = no budget set)
- No new table — just two columns on the existing `project` entity (Flyway V8)
- `ProjectResponse` gains: `budgetSeconds`, `budgetPeriod`, `usedSeconds` (from existing aggregation), `budgetPercent` (computed: usedSeconds / budgetSeconds * 100, null if no budget)
- For shared projects: budget measures **all members' combined time** (consistent with Part 2 shared-total semantics); do not filter by `owner_id`
- Thresholds: ≥ 80% = yellow warning indicator; ≥ 100% = red exceeded indicator
- Stop-task UX: after `POST /api/tasks/{id}/stop` resolves, frontend re-queries project aggregation and shows an inline alert if a threshold is newly crossed
- Budget editing uses the existing `PUT /api/projects/{id}` endpoint (no new endpoint needed)

### Custom feature 3 — Billable rates and cost reporting (M9C)
- One new nullable column on `project`: `hourly_rate DECIMAL(10,2)` (Flyway V9); null means "inherit from nearest ancestor that has a rate"
- Rate resolution in `ProjectService`: walk the `parent` chain upward until a non-null `hourly_rate` is found; return null if no ancestor has one. Cache the result as `effectiveHourlyRate` in `ProjectResponse`
- Cost calculation: `cost = duration_seconds / 3600.0 * effectiveHourlyRate`; null if `effectiveHourlyRate` is null; for running tasks substitute `NOW()` for `endTime`
- `ProjectResponse` gains: `hourlyRate` (the raw value, nullable), `effectiveHourlyRate` (resolved up the tree, nullable), `totalCost` (sum of task costs, nullable)
- Task rows in the frontend show per-task cost alongside duration when an effective rate exists
- CSV export: add `hourly_rate` and `cost` columns (blank cells when no effective rate); cost uses the same resolution logic
- No currency stored — amounts are unitless decimals; the frontend labels them with a "€/h" hint
- Rate editing uses the existing `PUT /api/projects/{id}` endpoint

## What NOT to do

- Never expose entity classes directly in REST responses — always map to DTOs
- Never commit `.env` files, secrets, or application-local.properties with real credentials
- Never skip `@Valid` on controller method parameters that accept user input
- Never delete or modify the database schema manually — use Flyway migrations
- Never use `git push --force` on main
- Never hardcode user IDs or assume a specific user — always derive from JWT principal
- Never skip the project membership check in `ProjectService` — non-members must not access shared project data
- Do not add features beyond the current issue scope
