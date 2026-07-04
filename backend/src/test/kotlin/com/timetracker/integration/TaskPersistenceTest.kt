package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.dto.LoginRequest
import com.timetracker.dto.RegisterRequest
import com.timetracker.dto.StartTaskRequest
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.TaskRepository
import com.timetracker.repository.UserRepository
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.Instant

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaskPersistenceTest {
    @Autowired lateinit var mockMvc: MockMvc

    @Autowired lateinit var objectMapper: ObjectMapper

    @Autowired lateinit var userRepository: UserRepository

    @Autowired lateinit var taskRepository: TaskRepository

    @Autowired lateinit var projectRepository: ProjectRepository

    @BeforeEach
    fun cleanDb() {
        taskRepository.deleteAll()
        projectRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun register(
        username: String = "alice",
        password: String = "password1",
    ): String {
        val result =
            mockMvc
                .post("/api/auth/register") {
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(RegisterRequest(username, "$username@test.com", password))
                }.andReturn()
        return objectMapper.readTree(result.response.contentAsString)["token"].asText()
    }

    private fun login(
        username: String = "alice",
        password: String = "password1",
    ): String {
        val result =
            mockMvc
                .post("/api/auth/login") {
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(LoginRequest(username, password))
                }.andExpect { status { isOk() } }
                .andReturn()
        return objectMapper.readTree(result.response.contentAsString)["token"].asText()
    }

    // ── Issue 39: timer survives browser close/reopen ──────────────────────────

    @Test
    fun `running task startTime persists after re-login`() {
        val token1 = register()
        val before = Instant.now()

        // Start task (simulates "browser open, start tracking")
        val startResult =
            mockMvc
                .post("/api/tasks/start") {
                    header("Authorization", "Bearer $token1")
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(StartTaskRequest(description = "Persistent work"))
                }.andExpect { status { isCreated() } }
                .andReturn()

        val startedTaskId = objectMapper.readTree(startResult.response.contentAsString)["id"].asText()
        val startTime =
            objectMapper.readTree(startResult.response.contentAsString)["startTime"].asText()
        assertNotNull(startTime)

        // Simulate "browser close": discard token1, obtain a fresh JWT via login
        val token2 = login()

        // Simulate "browser reopen": use new token to get current task
        val currentResult =
            mockMvc
                .get("/api/tasks/current") {
                    header("Authorization", "Bearer $token2")
                }.andExpect { status { isOk() } }
                .andReturn()

        val currentTree = objectMapper.readTree(currentResult.response.contentAsString)
        val currentId = currentTree["id"].asText()
        val currentStartTime = currentTree["startTime"].asText()

        // Same task returned after re-login
        assert(currentId == startedTaskId) { "Expected same task id after re-login" }

        // startTime must be within 1 second — H2 may truncate nanoseconds so we compare
        // parsed Instants rather than raw strings
        val origInstant = Instant.parse(startTime)
        val persistedInstant = Instant.parse(currentStartTime)
        val diffMillis = kotlin.math.abs(origInstant.toEpochMilli() - persistedInstant.toEpochMilli())
        assertTrue(diffMillis < 1000) { "startTime changed by ${diffMillis}ms after DB round-trip" }

        // endTime is absent/null — task is still running
        val endTimeNode = currentTree.get("endTime")
        assertTrue(endTimeNode == null || endTimeNode.isNull || endTimeNode.isMissingNode) {
            "Running task must have null endTime"
        }

        // startTime is within the test window — it was actually persisted as an instant
        val persistedStart = Instant.parse(currentStartTime)
        val after = Instant.now()
        assertTrue(!persistedStart.isBefore(before) && !persistedStart.isAfter(after)) {
            "startTime $persistedStart should be between $before and $after"
        }
    }

    @Test
    fun `elapsed time is computable from persisted startTime after re-login`() {
        val token1 = register()

        mockMvc
            .post("/api/tasks/start") {
                header("Authorization", "Bearer $token1")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(StartTaskRequest(description = "Elapsed check"))
            }.andExpect { status { isCreated() } }

        // Re-login (browser close/reopen)
        val token2 = login()

        val before = Instant.now()
        val currentResult =
            mockMvc
                .get("/api/tasks/current") {
                    header("Authorization", "Bearer $token2")
                }.andExpect { status { isOk() } }
                .andReturn()

        val startTime =
            Instant.parse(
                objectMapper.readTree(currentResult.response.contentAsString)["startTime"].asText(),
            )

        // Client-side elapsed time calculation (matches what DashboardPage does)
        val elapsedSeconds = before.epochSecond - startTime.epochSecond
        assertTrue(elapsedSeconds >= 0) { "Elapsed time must be non-negative" }
    }

    // ── Issue 40: data persists across simulated restart (H2 / repository level) ─

    @Test
    fun `all created tasks remain accessible after multiple requests`() {
        val token = register()

        // Create a task manually
        val createResult =
            mockMvc
                .post("/api/tasks/start") {
                    header("Authorization", "Bearer $token")
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(StartTaskRequest(description = "Task A"))
                }.andExpect { status { isCreated() } }
                .andReturn()

        val taskId = objectMapper.readTree(createResult.response.contentAsString)["id"].asText()

        // Retrieve via list — task must appear
        mockMvc
            .get("/api/tasks") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$[0].id") { value(taskId) }
                jsonPath("$[0].description") { value("Task A") }
            }

        // Retrieve via current endpoint — task must appear
        mockMvc
            .get("/api/tasks/current") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$.id") { value(taskId) }
            }
    }

    @Test
    fun `task data survives a stop operation and remains in list`() {
        val token = register()

        val startResult =
            mockMvc
                .post("/api/tasks/start") {
                    header("Authorization", "Bearer $token")
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(StartTaskRequest(description = "Completed task"))
                }.andExpect { status { isCreated() } }
                .andReturn()

        val taskId = objectMapper.readTree(startResult.response.contentAsString)["id"].asText()

        // Stop the task
        mockMvc
            .post("/api/tasks/$taskId/stop") {
                header("Authorization", "Bearer $token")
            }.andExpect { status { isOk() } }

        // Task still visible in list with endTime set
        mockMvc
            .get("/api/tasks") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$[0].id") { value(taskId) }
                jsonPath("$[0].description") { value("Completed task") }
                jsonPath("$[0].endTime") { isNotEmpty() }
            }
    }
}
