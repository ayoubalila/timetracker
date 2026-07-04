# TASKS.md — Milestones & Task Breakdown

Deadline: **2026-07-19 23:59 CEST** | Part II requirements update: **2026-06-29**

Each task maps to one GitHub Issue. Issues use the user-story format where marked [US]. All issues should have acceptance criteria in Given/When/Then format.

---

## Milestone 0 — Project scaffolding (Week 1: Jun 18–22)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 1 | ~~Set up Spring Boot + Kotlin backend skeleton~~ ✅ #1 / PR #2 | chore | Gradle, ktlint, Jacoco, Flyway, H2 test profile |
| 2 | ~~Set up React + TypeScript + Vite frontend skeleton~~ ✅ #3 / PR #4 | chore | ESLint, Prettier, Vitest, Tailwind, shadcn/ui |
| 3 | ~~Configure Docker Compose (PostgreSQL + backend)~~ ✅ #5 / PR #6 | chore | dev + prod profiles |
| 4 | ~~Set up GitHub Actions CI pipeline~~ ✅ #7 / PR #8 | ci | lint, test, coverage gates |
| 5 | ~~Add `.gitignore` (node_modules, build, target, dist, coverage)~~ ✅ #9 / PR #11 | chore | |
| 6 | ~~Write initial README.md (setup, build, run instructions)~~ ✅ #10 / PR #11 | docs | Required by spec §3.4 |
| 6b | ~~Switch CI to self-hosted runner with containerised jobs~~ ✅ #25 / PR #26 | ci | Eclipse Temurin JDK 21 + Node 24 containers |

---

## Milestone 1 — User management (Week 1–2: Jun 18–26)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 7 | ~~[US] Register a new account~~ ✅ #12 / PR #18 | feat | BCrypt hashing, username/email uniqueness validation |
| 8 | ~~[US] Log in and receive a JWT~~ ✅ #13 / PR #18 | feat | Spring Security, jjwt, 401 on invalid credentials |
| 9 | ~~[US] Log out (client-side token discard)~~ ✅ #14 / PR #18 | feat | Frontend clears token from localStorage |
| 10 | ~~[US] Change password~~ ✅ #15 / PR #18 | feat | Verify current password before update |
| 11 | ~~Secure all non-auth endpoints with JWT filter~~ ✅ #16 / PR #18 | feat | `OncePerRequestFilter`, 401 if token missing/invalid |
| 12 | ~~Unit tests — AuthService (register, login, change password)~~ ✅ #17 / PR #18 | test | Mockito, covers happy path + error cases |
| 13 | ~~Integration tests — AuthController~~ ✅ #17 / PR #18 | test | MockMvc + H2 |
| 14 | E2E test — register → login → logout flow | test | Playwright |

---

## Milestone 2 — Project management (Week 2: Jun 23–26)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 15 | ~~[US] Create, rename, and delete a project~~ ✅ #19 / PR #24 | feat | Validate name uniqueness per parent per user |
| 16 | ~~[US] Organise projects in a hierarchy (subprojects)~~ ✅ #20 / PR #24 | feat | Self-referential FK, max depth TBD (suggest 5) |
| 17 | ~~[US] View project tree in the sidebar~~ ✅ #21 / PR #24 | feat | Recursive tree component in React |
| 18 | ~~Unit tests — ProjectService~~ ✅ #22 / PR #24 | test | |
| 19 | ~~Integration tests — ProjectController~~ ✅ #23 / PR #24 | test | |
| 20 | E2E test — create project → add subproject → view tree | test | Playwright |

---

## Milestone 3 — Time tracking core (Week 2–3: Jun 23–Jul 1)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 21 | ~~[US] Start a task (begin time tracking)~~ ✅ #27 / PR #35 | feat | POST /api/tasks/start; enforce one active task per user |
| 22 | ~~[US] Stop the current running task~~ ✅ #28 / PR #35 | feat | POST /api/tasks/{id}/stop; sets endTime = NOW() |
| 23 | ~~[US] Live timer display while task is running~~ ✅ #29 / PR #35 | feat | Frontend polls `/api/tasks/current` every second or uses elapsed time from startTime |
| 24 | ~~[US] Add a task manually (with explicit start/end time)~~ ✅ #30 / PR #35 | feat | Validate endTime > startTime |
| 25 | ~~[US] Edit a task (description, times, associated projects)~~ ✅ #31 / PR #35 | feat | Cannot edit endTime to be before startTime |
| 26 | ~~[US] Delete a task~~ ✅ #32 / PR #35 | feat | |
| 27 | ~~Unit tests — TaskService~~ ✅ #33 / PR #35 | test | |
| 28 | ~~Integration tests — TaskController~~ ✅ #34 / PR #35 | test | |
| 29 | E2E test — start task → stop task → edit task | test | Playwright |

---

## Milestone 4 — Task overview & time aggregation (Week 3: Jun 29–Jul 5)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 30 | ~~[US] View tasks for today / this week / this month~~ ✅ #30 / PR #26db6b2 | feat | Tab UI on dashboard; query by date range |
| 31 | ~~[US] View all tasks associated with a project~~ ✅ #31 / PR #26db6b2 | feat | Project detail page with task list |
| 32 | ~~[US] View total time spent on a project (including subprojects, deduplicated)~~ ✅ #32 / PR #26db6b2 | feat | Recursive CTE; see PLANNING.md §3 for SQL |
| 33 | ~~[US] Select a custom time frame for project time summary~~ ✅ #33 / PR #26db6b2 | feat | Date-range picker in project detail |
| 34 | ~~Task overview — tabular view (list with columns)~~ ✅ #34 / PR #26db6b2 | feat | Sortable table: description, project, start, end, duration |
| 35 | Task overview — calendar-like view (week grid) | feat | Optional but strongly recommended per spec |
| 36 | ~~Unit tests — OverviewService, time aggregation~~ ✅ #36 / PR #26db6b2 | test | Edge cases: running task, task in multiple subprojects |
| 37 | ~~Integration tests — OverviewController, ProjectController#totalTime~~ ✅ #37 / PR #26db6b2 | test | |
| 38 | E2E test — project total time updates after task add/stop | test | Playwright |

---

## Milestone 5 — Data persistence & session continuity (Week 3: Jul 1–5)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 39 | ~~Verify time tracking survives browser close/reopen~~ ✅ | test | Running task's startTime persists; client recalculates elapsed time on login |
| 40 | ~~Verify all data persists across app restart~~ ✅ | test | Docker volume for PostgreSQL data |

(These are verification tasks, not new features — confirm with E2E tests.)

---

## Milestone 6 — Polish, security hardening, coverage (Week 4: Jul 6–12)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 41 | ~~Input validation — all controller endpoints~~ ✅ | feat | Bean Validation annotations, globalExceptionHandler returning RFC 7807 errors |
| 42 | ~~CORS configuration~~ ✅ | feat | Allow frontend origin only |
| 43 | ~~Rate limiting on auth endpoints~~ ✅ | feat | Simple in-memory bucket or Spring filter |
| 44 | Improve frontend error handling (toasts for API errors) | feat | |
| 45 | Keyboard shortcuts for start/stop (usability) | feat | Spec says "few interactions" — spacebar or similar |
| 46 | Achieve 90% line coverage — backend gap analysis & fill | test | Run Jacoco, add missing tests |
| 47 | Achieve 90% line coverage — frontend gap analysis & fill | test | Run Vitest coverage, add missing tests |
| 48 | Mutation testing baseline (Pitest) | test | Identify surviving mutants, improve assertions |

---

## Milestone 7A — Project sharing (Week 4: Jul 6–9)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 49 | Flyway V5 — `project_member` table | chore | Columns: `project_id` FK, `user_id` FK, `role` VARCHAR(20); UNIQUE (project_id, user_id) |
| 50 | [US] Invite a registered user to a project | feat | `POST /api/projects/{id}/members`; owner-only; 404 if username not found; 409 if already member |
| 51 | [US] View and remove project members | feat | `GET /api/projects/{id}/members`; `DELETE /api/projects/{id}/members/{userId}`; owner-only remove |
| 52 | [US] Shared project appears in invitee's project list | feat | `ProjectService.getAll()` returns owned + member projects; read-only unless owner |
| 53 | [US] Project members can add tasks to a shared project | feat | Membership check (owner OR member) in task creation; scoped by project access not user ownership |
| 54 | Unit tests — ProjectService sharing | test | Cover invite, remove, access check, non-member rejection |
| 55 | Integration tests — ProjectController sharing | test | MockMvc, H2; include auth for both owner and member tokens |

---

## Milestone 7B — Shared project task overview (Week 4: Jul 9–11)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 56 | [US] Project task list shows all members' tasks | feat | `GET /api/projects/{id}/tasks` returns tasks from all participating users |
| 57 | [US] Filter project task list by user | feat | `?userId=` query param on project tasks endpoint; member-only access |
| 58 | [US] Per-user time breakdown on project detail | feat | Frontend renders time totals per user alongside project total |
| 59 | Unit + integration tests — shared task overview | test | |

---

## Milestone 7C — Export (Week 4: Jul 10–12)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 60 | [US] Export project tasks for a specific month as CSV | feat | `GET /api/projects/{id}/export?month=2026-07`; includes subproject tasks |
| 61 | [US] Export all project tasks (no date filter) | feat | Same endpoint without `month` param; streaming for large datasets |
| 62 | Export format: CSV columns | feat | Columns: `username`, `project_path`, `description`, `start_time`, `end_time`, `duration_seconds` |
| 63 | Unit + integration tests — export endpoint | test | Verify CSV structure, month filtering, subproject inclusion |

---

## Milestone 7D — Time zones (Week 4: Jul 12–13)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 64 | Flyway V6 — `timezone` column on `users` table | chore | `VARCHAR(50) NOT NULL DEFAULT 'UTC'`; IANA tz string (e.g. `Europe/Berlin`) |
| 65 | [US] Set preferred time zone in account settings | feat | `PUT /api/auth/timezone`; validate against IANA tz database; persisted in DB |
| 66 | [US] New tasks default to my time zone | feat | Frontend pre-fills task start time using user's stored tz; backend stores UTC |
| 67 | [US] Shared project timestamps shown in my time zone | feat | Frontend converts all UTC timestamps to user's preferred tz for display |
| 68 | Unit + integration tests — timezone setting | test | |

---

## Milestone 7E → see Milestone 9

Custom features approved and detailed in **Milestone 9** below (issues 76–91).

---

## Milestone 8 — Final submission prep (Week 5: Jul 17–19)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 72 | Full end-to-end smoke test on clean Docker environment | test | Clone repo fresh, follow README, verify all features end-to-end |
| 73 | Write project report (`report/report.md`) | docs | Include custom features section per Part 2 §3; link issues + PRs |
| 74 | Final README review (all setup steps accurate?) | docs | |
| 75 | Ensure all open issues are closed or explicitly deferred | chore | |

---

## Milestone 9A — Task tags with cross-cutting filter (Week 5: Jul 13–15)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 76 | Flyway V7 — `tag` and `task_tag` tables | chore | `tag`(id UUID PK, name VARCHAR(50), color VARCHAR(7), owner_id FK → users); `task_tag`(tag_id FK, task_id FK, PK both) |
| 77 | [US] Create and delete personal tags (name + color) | feat | `GET/POST/DELETE /api/tags`; tags are user-scoped (never shared across users) |
| 78 | [US] Assign tags to a task via multi-select tag picker | feat | `tagIds: List<UUID>` in `CreateTaskRequest` + `UpdateTaskRequest`; `tags: List<TagResponse>` in `TaskResponse`; chips in TaskForm UI |
| 79 | [US] Filter task list and overviews by tag | feat | `?tagId=UUID` on `GET /api/tasks`, `GET /api/overview/*`, `GET /api/projects/{id}/tasks`; tag-filter dropdown on dashboard |
| 80 | Tags column in CSV export | feat | Comma-separated tag names as an extra column in `GET /api/projects/{id}/export` |
| 81 | Unit + integration tests — tags | test | Cover tag CRUD, assignment, filter, export column |

---

## Milestone 9B — Project time budgets with progress alerts (Week 5: Jul 14–16)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 82 | Flyway V8 — budget columns on `project` | chore | `budget_seconds BIGINT` (nullable), `budget_period VARCHAR(20)` (nullable; values: `TOTAL`, `WEEKLY`, `MONTHLY`) |
| 83 | [US] Set a time budget on a project | feat | Budget fields in `CreateProjectRequest`/`UpdateProjectRequest`; `ProjectResponse` includes `budgetSeconds`, `budgetPeriod`, `usedSeconds`, `budgetPercent` |
| 84 | [US] Progress bar and usage % on project detail and sidebar | feat | Bar turns yellow at ≥ 80%, red at ≥ 100%; shown next to total time |
| 85 | [US] Inline warning when stopping a task crosses a budget threshold | feat | After `POST /api/tasks/{id}/stop`, frontend re-queries aggregated time and shows alert if threshold newly crossed |
| 86 | Unit + integration tests — time budgets | test | Cover budget CRUD, aggregation comparison, shared-project combined total |

---

## Milestone 9C — Billable rates and cost reporting (Week 5: Jul 15–17)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 87 | Flyway V9 — `hourly_rate` column on `project` | chore | `DECIMAL(10,2)` nullable; null = inherit from nearest ancestor with a rate |
| 88 | [US] Set an hourly rate on a project (subprojects inherit) | feat | Rate field in project create/edit form; `ProjectResponse` includes `effectiveHourlyRate` (walks parent chain; null if none found) |
| 89 | [US] View cost per task and total cost on project detail | feat | Task rows show cost = duration × effective rate; project header shows total cost alongside total time |
| 90 | Cost columns in CSV export | feat | Add `hourly_rate` and `cost` columns to export (blank if no effective rate) |
| 91 | Unit + integration tests — billable rates | test | Cover rate inheritance chain walk, zero-duration edge case, null-rate export column |

---

## Issue template (for GitHub)

```markdown
## User Story
As a [role], I want [goal], so that [benefit].

## Tasks
- [ ] Backend: implement service method
- [ ] Backend: add controller endpoint
- [ ] Backend: write unit tests
- [ ] Backend: write integration tests
- [ ] Frontend: implement UI component/page
- [ ] Frontend: write component tests
- [ ] E2E: write Playwright system test

## Acceptance Criteria
- Given [precondition], when [action], then [expected result].
- Given [precondition], when [action], then [expected result].

## Definition of Done
- [ ] All acceptance criteria pass as automated tests
- [ ] CI pipeline is green
- [ ] Coverage ≥ 90% not regressed
- [ ] PR linked to this issue and merged
```

---

## Priority order summary

1. Milestone 0 (scaffolding + CI) — nothing else works without this ✅
2. Milestone 1 (auth) — all features require authenticated users ✅
3. Milestone 2 (projects) — tasks need projects to be associated with ✅
4. Milestone 3 (time tracking) — core feature, most complex ✅
5. Milestone 4 (overview) — depends on tracked data existing
6. Milestone 5 (persistence verification) — confirm invariants
7. Milestone 7A (project sharing) — Part II mandatory; new entity + security model
8. Milestone 7B (shared task overview) — depends on sharing
9. Milestone 7C (export) — depends on shared project task data; M9C adds cost columns here
10. Milestone 7D (time zones) — depends on user settings infrastructure
11. Milestone 9A (task tags) — Master's custom; add tag filter + export column after M7C exists
12. Milestone 9B (time budgets) — Master's custom; reuses M4 aggregation
13. Milestone 9C (billable rates) — Master's custom; adds cost columns on top of M7C export
14. Milestone 6 (polish + coverage) — quality gate; do last before submission
15. Milestone 8 (submission) — always last

## Remaining timeline (today: 2026-07-01 | deadline: 2026-07-19)

| Slot | Dates | Focus |
|------|-------|-------|
| Week 3 | Jul 1–5 | M4 Task overview + time aggregation; M5 persistence verification |
| Week 4a | Jul 6–9 | M7A Project sharing (backend + frontend) |
| Week 4b | Jul 9–11 | M7B Shared task overview (all users + filter) |
| Week 4c | Jul 10–12 | M7C Export (CSV endpoint + frontend download) |
| Week 4d | Jul 12–13 | M7D Time zones (DB + settings + display) |
| Week 5a | Jul 13–15 | M9A Task tags (Flyway V7, tag CRUD, task editor, filter, export column) |
| Week 5b | Jul 14–16 | M9B Time budgets (Flyway V8, budget fields, progress bar, stop-task alert) |
| Week 5c | Jul 15–17 | M9C Billable rates (Flyway V9, rate inheritance, cost display, export columns) |
| Week 5d | Jul 16–18 | M6 Coverage hardening; input validation; fix any CI gaps |
| Week 5e | Jul 17–19 | M8 Smoke test on clean Docker clone; write report; final submission |
