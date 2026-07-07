package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.RegisterRequest
import com.timetracker.dto.StartTaskRequest
import com.timetracker.dto.UpdateTaskRequest
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.TagRepository
import com.timetracker.repository.TaskRepository
import com.timetracker.repository.UserRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TaskControllerTest {
    @Autowired lateinit var mockMvc: MockMvc

    @Autowired lateinit var objectMapper: ObjectMapper

    @Autowired lateinit var userRepository: UserRepository

    @Autowired lateinit var taskRepository: TaskRepository

    @Autowired lateinit var tagRepository: TagRepository

    @Autowired lateinit var projectRepository: ProjectRepository

    @BeforeEach
    fun cleanDb() {
        taskRepository.deleteAll()
        tagRepository.deleteAll()
        projectRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun registerAndGetToken(
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

    private fun startTask(
        token: String,
        description: String? = null,
    ): UUID {
        val result =
            mockMvc
                .post("/api/tasks/start") {
                    header("Authorization", "Bearer $token")
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(StartTaskRequest(description = description))
                }.andExpect { status { isCreated() } }
                .andReturn()
        return UUID.fromString(objectMapper.readTree(result.response.contentAsString)["id"].asText())
    }

    private fun createProject(
        token: String,
        name: String,
    ): UUID {
        val result =
            mockMvc
                .post("/api/projects") {
                    header("Authorization", "Bearer $token")
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(CreateProjectRequest(name = name))
                }.andExpect { status { isCreated() } }
                .andReturn()
        return UUID.fromString(objectMapper.readTree(result.response.contentAsString)["id"].asText())
    }

    // ── list ──────────────────────────────────────────────────────────────────

    @Test
    fun `GET tasks - 200 returns empty list`() {
        val token = registerAndGetToken()
        mockMvc
            .get("/api/tasks") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$") { isArray() }
            }
    }

    @Test
    fun `GET tasks - 401 without token`() {
        mockMvc.get("/api/tasks").andExpect { status { isUnauthorized() } }
    }

    // ── start ──────────────────────────────────────────────────────────────────

    @Test
    fun `POST tasks_start - 201 creates running task`() {
        val token = registerAndGetToken()
        mockMvc
            .post("/api/tasks/start") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(StartTaskRequest(description = "Working"))
            }.andExpect {
                status { isCreated() }
                jsonPath("$.description") { value("Working") }
                jsonPath("$.endTime") { doesNotExist() }
                jsonPath("$.startTime") { isNotEmpty() }
            }
    }

    @Test
    fun `POST tasks_start - 409 when task already running`() {
        val token = registerAndGetToken()
        startTask(token)
        mockMvc
            .post("/api/tasks/start") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(StartTaskRequest())
            }.andExpect { status { isConflict() } }
    }

    @Test
    fun `POST tasks_start - associates project`() {
        val token = registerAndGetToken()
        val projectId = createProject(token, "Work")
        mockMvc
            .post("/api/tasks/start") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(StartTaskRequest(projectIds = listOf(projectId)))
            }.andExpect {
                status { isCreated() }
                jsonPath("$.projectIds[0]") { value(projectId.toString()) }
            }
    }

    // ── current ────────────────────────────────────────────────────────────────

    @Test
    fun `GET tasks_current - 200 returns running task`() {
        val token = registerAndGetToken()
        val id = startTask(token, "Active")
        mockMvc
            .get("/api/tasks/current") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id.toString()) }
                jsonPath("$.description") { value("Active") }
            }
    }

    @Test
    fun `GET tasks_current - 204 when no task running`() {
        val token = registerAndGetToken()
        mockMvc
            .get("/api/tasks/current") {
                header("Authorization", "Bearer $token")
            }.andExpect { status { isNoContent() } }
    }

    // ── stop ───────────────────────────────────────────────────────────────────

    @Test
    fun `POST tasks_{id}_stop - 200 stops running task`() {
        val token = registerAndGetToken()
        val id = startTask(token)
        mockMvc
            .post("/api/tasks/$id/stop") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$.endTime") { isNotEmpty() }
            }
    }

    @Test
    fun `POST tasks_{id}_stop - 400 when already stopped`() {
        val token = registerAndGetToken()
        val id = startTask(token)
        mockMvc.post("/api/tasks/$id/stop") { header("Authorization", "Bearer $token") }
        mockMvc
            .post("/api/tasks/$id/stop") {
                header("Authorization", "Bearer $token")
            }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `POST tasks_{id}_stop - 404 for other user task`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = startTask(aliceToken)
        mockMvc
            .post("/api/tasks/$id/stop") {
                header("Authorization", "Bearer $bobToken")
            }.andExpect { status { isNotFound() } }
    }

    // ── create manual ──────────────────────────────────────────────────────────

    @Test
    fun `POST tasks - 201 creates manual task`() {
        val token = registerAndGetToken()
        val start = Instant.now().minusSeconds(3600)
        val end = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(description = "Past work", startTime = start, endTime = end),
                    )
            }.andExpect {
                status { isCreated() }
                jsonPath("$.description") { value("Past work") }
                jsonPath("$.endTime") { isNotEmpty() }
            }
    }

    @Test
    fun `POST tasks - 400 when endTime is before startTime`() {
        val token = registerAndGetToken()
        val start = Instant.now()
        val end = start.minusSeconds(1)
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(startTime = start, endTime = end),
                    )
            }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `POST tasks - 409 when creating running task while one is active`() {
        val token = registerAndGetToken()
        startTask(token)
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(startTime = Instant.now().minusSeconds(60)),
                    )
            }.andExpect { status { isConflict() } }
    }

    // ── getById ────────────────────────────────────────────────────────────────

    @Test
    fun `GET tasks_{id} - 200 returns task`() {
        val token = registerAndGetToken()
        val id = startTask(token, "My task")
        mockMvc
            .get("/api/tasks/$id") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id.toString()) }
                jsonPath("$.description") { value("My task") }
            }
    }

    @Test
    fun `GET tasks_{id} - 404 for other user task`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = startTask(aliceToken)
        mockMvc
            .get("/api/tasks/$id") {
                header("Authorization", "Bearer $bobToken")
            }.andExpect { status { isNotFound() } }
    }

    // ── update ─────────────────────────────────────────────────────────────────

    @Test
    fun `PUT tasks_{id} - 200 updates task`() {
        val token = registerAndGetToken()
        val id = startTask(token)
        val newStart = Instant.now().minusSeconds(7200)
        val newEnd = Instant.now().minusSeconds(3600)
        mockMvc
            .put("/api/tasks/$id") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        UpdateTaskRequest(description = "Updated", startTime = newStart, endTime = newEnd),
                    )
            }.andExpect {
                status { isOk() }
                jsonPath("$.description") { value("Updated") }
                jsonPath("$.endTime") { isNotEmpty() }
            }
    }

    @Test
    fun `PUT tasks_{id} - 400 when endTime before startTime`() {
        val token = registerAndGetToken()
        val id = startTask(token)
        val start = Instant.now()
        mockMvc
            .put("/api/tasks/$id") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        UpdateTaskRequest(startTime = start, endTime = start.minusSeconds(1)),
                    )
            }.andExpect { status { isBadRequest() } }
    }

    // ── delete ─────────────────────────────────────────────────────────────────

    @Test
    fun `DELETE tasks_{id} - 204 removes task`() {
        val token = registerAndGetToken()
        val id = startTask(token)
        mockMvc
            .delete("/api/tasks/$id") {
                header("Authorization", "Bearer $token")
            }.andExpect { status { isNoContent() } }

        mockMvc
            .get("/api/tasks/$id") {
                header("Authorization", "Bearer $token")
            }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `DELETE tasks_{id} - 404 for other user task`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = startTask(aliceToken)
        mockMvc
            .delete("/api/tasks/$id") {
                header("Authorization", "Bearer $bobToken")
            }.andExpect { status { isNotFound() } }
    }
}
