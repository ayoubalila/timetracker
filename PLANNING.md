# PLANNING.md — TimeTracker Architecture & Design

## 1. Tech-stack justification

**React + TypeScript + Vite (frontend)**
React's component model maps naturally to the interactive time-tracking UI (live timer, modals, project trees). TypeScript catches type errors at compile time, which is critical when the AI generates most of the code. Vite provides instant HMR during development and a fast build for the production bundle served by Spring Boot.

**Kotlin + Spring Boot 3 (backend)**
JVM is required by the spec. Kotlin's data classes and null-safety eliminate most boilerplate DTO and entity code; Spring Boot's auto-configuration means less configuration to get wrong. Spring Security + Spring Data JPA are battle-tested and have extensive LLM training data. Spring Boot can also serve the bundled frontend from `src/main/resources/public/`, avoiding a separate nginx container.

**PostgreSQL (prod) / H2 (tests)**
PostgreSQL supports recursive CTEs needed for hierarchy aggregation and runs locally via Docker Compose. H2 runs embedded for unit/integration tests — no Docker required in the grading test command.

**JWT authentication**
Stateless tokens survive browser restarts, which is necessary for the requirement that time tracking continues even if the browser is closed (the server tracks `startTime`; the client just reads it on reconnect).

---

## 2. High-level architecture

```
Browser (React SPA)
        │  HTTPS / JSON REST API
        ▼
┌──────────────────────────────────────┐
│  Spring Boot Application             │
│  ┌────────────┐  ┌─────────────────┐ │
│  │ Controllers│  │ Spring Security │ │
│  │ (REST API) │  │ JWT Filter      │ │
│  └─────┬──────┘  └─────────────────┘ │
│        │                             │
│  ┌─────▼──────┐                      │
│  │  Services  │  (business logic)    │
│  └─────┬──────┘                      │
│        │                             │
│  ┌─────▼──────┐                      │
│  │Repositories│  (Spring Data JPA)   │
│  └─────┬──────┘                      │
│        │                             │
│  ┌─────▼──────┐                      │
│  │ PostgreSQL │                      │
│  └────────────┘                      │
└──────────────────────────────────────┘
```

- The React build output is placed in `backend/src/main/resources/public/` so Spring Boot serves it on `/`.
- All REST endpoints are under `/api/**`.
- Spring Security intercepts every request; JWT is verified in a `OncePerRequestFilter`.
- Flyway manages database migrations so schema changes are versioned and reproducible.

---

## 3. Domain model

### Entities

```
User
  id          UUID PK
  username    VARCHAR(50) UNIQUE NOT NULL
  email       VARCHAR(255) UNIQUE NOT NULL
  password    VARCHAR(255) NOT NULL          -- BCrypt hash
  createdAt   TIMESTAMP NOT NULL

Project
  id          UUID PK
  name        VARCHAR(100) NOT NULL
  description TEXT
  color       VARCHAR(7)                     -- hex colour for UI
  parent      UUID FK → Project (nullable)   -- self-referential hierarchy
  owner       UUID FK → User NOT NULL
  createdAt   TIMESTAMP NOT NULL
  -- UNIQUE (owner, name, parent)            -- no duplicate names under same parent

Task
  id          UUID PK
  description VARCHAR(500)
  startTime   TIMESTAMP NOT NULL
  endTime     TIMESTAMP (nullable)           -- null = currently running
  owner       UUID FK → User NOT NULL
  createdAt   TIMESTAMP NOT NULL
  updatedAt   TIMESTAMP NOT NULL

TaskProject  (join table — Task ↔ Project many-to-many)
  taskId      UUID FK → Task
  projectId   UUID FK → Project
  PRIMARY KEY (taskId, projectId)
```

### Key invariants

1. A user can have at most one running task (endTime IS NULL) at any time.
2. `endTime >= startTime` always.
3. A project's `parent` must belong to the same owner.
4. Deleting a project cascades to `TaskProject` rows (task remains, association removed).

### Hierarchy time aggregation (business rule)

Total time on project P = duration of all tasks that are associated with P **or any descendant of P**, counting each task **at most once**, regardless of how many subprojects it belongs to.

Implementation: recursive CTE in PostgreSQL that walks the project tree, collects the distinct set of task IDs, then sums durations. For running tasks `endTime` is substituted with `NOW()`.

```sql
WITH RECURSIVE subtree AS (
  SELECT id FROM project WHERE id = :projectId AND owner_id = :userId
  UNION ALL
  SELECT p.id FROM project p
    JOIN subtree s ON p.parent_id = s.id
),
task_ids AS (
  SELECT DISTINCT tp.task_id
  FROM task_project tp
  WHERE tp.project_id IN (SELECT id FROM subtree)
)
SELECT COALESCE(SUM(
  EXTRACT(EPOCH FROM (COALESCE(t.end_time, NOW()) - t.start_time))
), 0) AS total_seconds
FROM task t
JOIN task_ids ti ON t.id = ti.task_id
WHERE t.owner_id = :userId;
```

---

## 4. REST API surface

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Return JWT |
| PUT | `/api/auth/password` | Change password (auth required) |
| GET | `/api/projects` | List user's top-level projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/{id}` | Get project + subprojects + total time |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project |
| GET | `/api/tasks` | List tasks (query params: date range, projectId) |
| POST | `/api/tasks` | Create task (manual) |
| POST | `/api/tasks/start` | Start a new running task |
| POST | `/api/tasks/{id}/stop` | Stop a running task |
| GET | `/api/tasks/{id}` | Get single task |
| PUT | `/api/tasks/{id}` | Update task (time, description, projects) |
| DELETE | `/api/tasks/{id}` | Delete task |
| GET | `/api/tasks/current` | Get the currently running task (if any) |
| GET | `/api/overview/day` | Tasks for today |
| GET | `/api/overview/week` | Tasks for current week |
| GET | `/api/overview/month` | Tasks for current month |

---

## 5. UI screens

### Screen 1 — Login / Register
```
┌─────────────────────────────────┐
│         ⏱ TimeTracker          │
│                                 │
│  [Tab: Login] [Tab: Register]   │
│                                 │
│  Username  ________________     │
│  Password  ________________     │
│                                 │
│         [Login / Register]      │
└─────────────────────────────────┘
```

### Screen 2 — Dashboard (main view after login)
```
┌──────────────────────────────────────────────────────┐
│ ⏱ TimeTracker          [John Doe ▾]  [Logout]       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  CURRENT TASK                                        │
│  ┌────────────────────────────────────────────────┐  │
│  │  🔴 Working on Final Report   02:14:33         │  │
│  │  Project: AI-Driven Dev > Final Project        │  │
│  │                          [■ Stop]              │  │
│  └────────────────────────────────────────────────┘  │
│  [▶ Start new task]                                  │
│                                                      │
│  TODAY  ─────────────────────────────────           │
│  [Task row]  Description  Project  09:00–10:30  1.5h │
│  [Task row]  ...                                     │
│                                                      │
│  [Tab: Day] [Tab: Week] [Tab: Month]                 │
│                                                      │
│  ┌─ Calendar / Table view ─────────────────────┐    │
│  │  Mon  Tue  Wed  Thu  Fri  Sat  Sun           │    │
│  │  ...                                         │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Screen 3 — Projects list (sidebar or dedicated page)
```
┌──────────────────────────────────────┐
│ Projects                 [+ New]     │
├──────────────────────────────────────┤
│ 📁 University                        │
│   📁 AI-Driven Dev      14h 23m      │
│     📄 Final Project     8h 12m      │
│     📄 Weekly Assignments 6h 11m     │
│   📁 Software Engineering  5h 00m    │
│ 📁 Freelance                         │
│   📄 Client A           22h 10m      │
│ [+ Add top-level project]            │
└──────────────────────────────────────┘
```

### Screen 4 — Project detail
```
┌────────────────────────────────────────────────────┐
│ ← Projects  /  University  /  AI-Driven Dev        │
│                                                    │
│  AI-Driven Dev                    [Edit] [Delete]  │
│  Total: 14h 23m  (this month ▾)                    │
│                                                    │
│  Subprojects ──────────────────────                │
│  [+ Add subproject]                                │
│  📄 Final Project   8h 12m  [→]                    │
│  📄 Weekly Assign.  6h 11m  [→]                    │
│                                                    │
│  Tasks ─────────────────────────────              │
│  [+ Add task]                                      │
│  [Task row] ...                                    │
└────────────────────────────────────────────────────┘
```

### Screen 5 — Task create/edit modal
```
┌────────────────────────────────────┐
│ Edit Task                    [✕]   │
│                                    │
│  Description                       │
│  ________________________________  │
│                                    │
│  Start time   [2026-06-18 09:00]   │
│  End time     [2026-06-18 10:30]   │
│               (empty = running)    │
│                                    │
│  Projects  [AI-Driven Dev ✕]  [+]  │
│                                    │
│         [Cancel]  [Save]           │
└────────────────────────────────────┘
```

### Screen 6 — Settings
```
┌────────────────────────────┐
│ Account Settings           │
│                            │
│ Change Password            │
│  Current  ______________   │
│  New      ______________   │
│  Confirm  ______________   │
│           [Update]         │
└────────────────────────────┘
```

---

## 6. Flyway migration plan

| Version | Description |
|---------|-------------|
| V1 | Create `users` table |
| V2 | Create `project` table with self-referential FK |
| V3 | Create `task` table |
| V4 | Create `task_project` join table |

---

## 7. CI pipeline (GitHub Actions)

```
on: [push, pull_request]

jobs:
  backend:
    - Checkout
    - Setup JDK 21
    - Run ./gradlew ktlintCheck
    - Run ./gradlew test (unit + integration, H2)
    - Run ./gradlew jacocoTestReport
    - Fail if coverage < 90%

  frontend:
    - Checkout
    - Setup Node 24
    - npm ci
    - npm run lint
    - npm run coverage
    - Fail if coverage < 90%

  system-tests:
    - Checkout
    - docker compose up -d (PostgreSQL)
    - ./gradlew bootRun & (start backend)
    - npm run dev & (or use built assets)
    - ./gradlew test -t SystemTest
    - docker compose down
```

---

## 8. Docker Compose layout

```yaml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD }
    volumes: [postgres_data:/var/lib/postgresql/data]

  backend:
    build: ./backend
    depends_on: [db]
    environment: { DB_URL, DB_USER, DB_PASS, JWT_SECRET }
    ports: ["8080:8080"]

  # frontend assets are served by Spring Boot from /public
  # so no separate frontend container needed
```
