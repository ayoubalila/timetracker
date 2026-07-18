import { defineConfig, devices } from '@playwright/test'

const BACKEND_PORT = 8080
const FRONTEND_PORT = 5173

// Locally, docker-compose.test.yml publishes db-test on localhost:5433. In CI the system
// job runs in a container, where the db-test service is reachable by service name on its
// internal port instead — see .github/workflows/ci.yml, which sets these two env vars.
const DB_HOST = process.env.E2E_DB_HOST ?? 'localhost'
const DB_PORT = process.env.E2E_DB_PORT ?? '5433'

// System tests run against a real backend + frontend + dedicated Postgres test
// database (docker-compose.test.yml), never against production data — see
// CLAUDE.md testing rules. Start the test database before running these tests:
//   docker compose -f ../docker-compose.test.yml up -d
export default defineConfig({
  testDir: './tests',
  // Auth endpoints share a per-IP rate limit (10 req/min — see RateLimitFilter); running
  // specs in parallel makes every test hit that shared bucket from 127.0.0.1 and randomly
  // trips it. Serial execution keeps the suite deterministic (cf. CLAUDE.md testing rules).
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: [
    {
      command:
        `./gradlew bootRun --args="--spring.datasource.url=jdbc:postgresql://${DB_HOST}:${DB_PORT}/timetracker_test --spring.datasource.username=timetracker --spring.datasource.password=timetracker"`,
      cwd: '../backend',
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      cwd: '../frontend',
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
