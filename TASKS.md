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
| 30 | [US] View tasks for today / this week / this month | feat | Tab UI on dashboard; query by date range |
| 31 | [US] View all tasks associated with a project | feat | Project detail page with task list |
| 32 | [US] View total time spent on a project (including subprojects, deduplicated) | feat | Recursive CTE; see PLANNING.md §3 for SQL |
| 33 | [US] Select a custom time frame for project time summary | feat | Date-range picker in project detail |
| 34 | Task overview — tabular view (list with columns) | feat | Sortable table: description, project, start, end, duration |
| 35 | Task overview — calendar-like view (week grid) | feat | Optional but strongly recommended per spec |
| 36 | Unit tests — OverviewService, time aggregation | test | Edge cases: running task, task in multiple subprojects |
| 37 | Integration tests — OverviewController, ProjectController#totalTime | test | |
| 38 | E2E test — project total time updates after task add/stop | test | Playwright |

---

## Milestone 5 — Data persistence & session continuity (Week 3: Jul 1–5)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 39 | Verify time tracking survives browser close/reopen | test | Running task's startTime persists; client recalculates elapsed time on login |
| 40 | Verify all data persists across app restart | test | Docker volume for PostgreSQL data |

(These are verification tasks, not new features — confirm with E2E tests.)

---

## Milestone 6 — Polish, security hardening, coverage (Week 4: Jul 6–12)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 41 | Input validation — all controller endpoints | feat | Bean Validation annotations, globalExceptionHandler returning RFC 7807 errors |
| 42 | CORS configuration | feat | Allow frontend origin only |
| 43 | Rate limiting on auth endpoints | feat | Simple in-memory bucket or Spring filter |
| 44 | Improve frontend error handling (toasts for API errors) | feat | |
| 45 | Keyboard shortcuts for start/stop (usability) | feat | Spec says "few interactions" — spacebar or similar |
| 46 | Achieve 90% line coverage — backend gap analysis & fill | test | Run Jacoco, add missing tests |
| 47 | Achieve 90% line coverage — frontend gap analysis & fill | test | Run Vitest coverage, add missing tests |
| 48 | Mutation testing baseline (Pitest) | test | Identify surviving mutants, improve assertions |

---

## Milestone 7 — Part II requirements (Week 4–5: Jun 29–Jul 15)

Requirements update arrives **2026-06-29**. Leave capacity here; tasks will be created after reading the update.

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 49+ | TBD — Part II features | feat | Created after 2026-06-29 |

---

## Milestone 8 — Final submission prep (Week 5: Jul 13–19)

| # | Issue title | Type | Notes |
|---|-------------|------|-------|
| 50 | Full end-to-end smoke test on clean Docker environment | test | Follow README from scratch on a clean machine |
| 51 | Write project report (`report/report.md`) | docs | See spec §3.2 for required sections |
| 52 | Final README review (all setup steps accurate?) | docs | |
| 53 | Ensure all open issues are closed or explicitly deferred | chore | |

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

1. Milestone 0 (scaffolding + CI) — nothing else works without this
2. Milestone 1 (auth) — all features require authenticated users
3. Milestone 2 (projects) — tasks need projects to be associated with
4. Milestone 3 (time tracking) — core feature, most complex
5. Milestone 4 (overview) — depends on tracked data existing
6. Milestone 5 (persistence verification) — confirm invariants
7. Milestone 6 (polish + coverage) — quality gate
8. Milestone 7 (Part II) — unknown, leave buffer
9. Milestone 8 (submission) — always last
