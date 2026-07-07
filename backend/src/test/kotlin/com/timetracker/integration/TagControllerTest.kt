package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.dto.CreateTagRequest
import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.RegisterRequest
import com.timetracker.repository.ProjectMemberRepository
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
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TagControllerTest {
    @Autowired lateinit var mockMvc: MockMvc

    @Autowired lateinit var objectMapper: ObjectMapper

    @Autowired lateinit var userRepository: UserRepository

    @Autowired lateinit var tagRepository: TagRepository

    @Autowired lateinit var taskRepository: TaskRepository

    @Autowired lateinit var projectRepository: ProjectRepository

    @Autowired lateinit var memberRepository: ProjectMemberRepository

    @BeforeEach
    fun cleanDb() {
        taskRepository.deleteAll()
        tagRepository.deleteAll()
        memberRepository.deleteAll()
        projectRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun registerAndGetToken(username: String = "alice"): String {
        val result =
            mockMvc
                .post("/api/auth/register") {
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(RegisterRequest(username, "$username@test.com", "password1"))
                }.andReturn()
        return objectMapper.readTree(result.response.contentAsString)["token"].asText()
    }

    private fun createTag(
        token: String,
        name: String = "deep-work",
        color: String = "#4A90D9",
    ): UUID {
        val result =
            mockMvc
                .post("/api/tags") {
                    header("Authorization", "Bearer $token")
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(CreateTagRequest(name = name, color = color))
                }.andExpect { status { isCreated() } }
                .andReturn()
        return UUID.fromString(objectMapper.readTree(result.response.contentAsString)["id"].asText())
    }

    // ── GET /api/tags ──────────────────────────────────────────────────────────

    @Test
    fun `GET tags - 200 returns empty list`() {
        val token = registerAndGetToken()
        mockMvc
            .get("/api/tags") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(0) }
            }
    }

    @Test
    fun `GET tags - 401 without token`() {
        mockMvc.get("/api/tags").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `GET tags - returns only own tags`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        createTag(aliceToken, "alice-tag")
        createTag(bobToken, "bob-tag")

        mockMvc
            .get("/api/tags") { header("Authorization", "Bearer $aliceToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].name") { value("alice-tag") }
            }
    }

    // ── POST /api/tags ─────────────────────────────────────────────────────────

    @Test
    fun `POST tags - 201 creates tag`() {
        val token = registerAndGetToken()
        mockMvc
            .post("/api/tags") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateTagRequest(name = "meeting", color = "#E74C3C"))
            }.andExpect {
                status { isCreated() }
                jsonPath("$.name") { value("meeting") }
                jsonPath("$.color") { value("#E74C3C") }
                jsonPath("$.id") { exists() }
            }
    }

    @Test
    fun `POST tags - 409 for duplicate name`() {
        val token = registerAndGetToken()
        createTag(token, "deep-work")
        mockMvc
            .post("/api/tags") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateTagRequest(name = "deep-work", color = "#AABBCC"))
            }.andExpect { status { isConflict() } }
    }

    @Test
    fun `POST tags - 400 for invalid color format`() {
        val token = registerAndGetToken()
        mockMvc
            .post("/api/tags") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateTagRequest(name = "bad", color = "notacolor"))
            }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `POST tags - 401 without token`() {
        mockMvc
            .post("/api/tags") {
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateTagRequest(name = "x", color = "#AABBCC"))
            }.andExpect { status { isUnauthorized() } }
    }

    // ── DELETE /api/tags/{id} ──────────────────────────────────────────────────

    @Test
    fun `DELETE tags - 204 removes tag`() {
        val token = registerAndGetToken()
        val id = createTag(token)
        mockMvc
            .delete("/api/tags/$id") { header("Authorization", "Bearer $token") }
            .andExpect { status { isNoContent() } }
        mockMvc
            .get("/api/tags") { header("Authorization", "Bearer $token") }
            .andExpect { jsonPath("$.length()") { value(0) } }
    }

    @Test
    fun `DELETE tags - 404 for unknown id`() {
        val token = registerAndGetToken()
        mockMvc
            .delete("/api/tags/${UUID.randomUUID()}") { header("Authorization", "Bearer $token") }
            .andExpect { status { isNotFound() } }
    }

    @Test
    fun `DELETE tags - 404 for another user tag`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val tagId = createTag(aliceToken)
        mockMvc
            .delete("/api/tags/$tagId") { header("Authorization", "Bearer $bobToken") }
            .andExpect { status { isNotFound() } }
    }

    // ── task tag assignment and filtering ──────────────────────────────────────

    @Test
    fun `POST tasks with tagIds - response includes tags`() {
        val token = registerAndGetToken()
        val tagId = createTag(token, "deep-work", "#4A90D9")
        val start = Instant.now().minusSeconds(3600)
        val end = Instant.now().minusSeconds(60)
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Focused work",
                            startTime = start,
                            endTime = end,
                            tagIds = listOf(tagId),
                        ),
                    )
            }.andExpect {
                status { isCreated() }
                jsonPath("$.tags.length()") { value(1) }
                jsonPath("$.tags[0].name") { value("deep-work") }
                jsonPath("$.tags[0].color") { value("#4A90D9") }
            }
    }

    @Test
    fun `GET tasks with tagId filter - returns only tagged tasks`() {
        val token = registerAndGetToken()
        val tagId = createTag(token, "meeting", "#E74C3C")
        val start = Instant.now().minusSeconds(3600)
        val end = Instant.now().minusSeconds(60)

        // task with tag
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(startTime = start, endTime = end, description = "Meeting", tagIds = listOf(tagId)),
                    )
            }.andExpect { status { isCreated() } }

        // task without tag
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(startTime = start.minusSeconds(7200), endTime = start.minusSeconds(3600), description = "Coding"),
                    )
            }.andExpect { status { isCreated() } }

        // filter by tag — should return 1
        mockMvc
            .get("/api/tasks?tagId=$tagId") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].description") { value("Meeting") }
            }
    }

    @Test
    fun `GET overview with tagId filter - returns only tagged tasks`() {
        val token = registerAndGetToken()
        val tagId = createTag(token, "reading", "#27AE60")
        val start = Instant.now().minusSeconds(1800)
        val end = Instant.now().minusSeconds(60)

        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(startTime = start, endTime = end, description = "Reading book", tagIds = listOf(tagId)),
                    )
            }.andExpect { status { isCreated() } }

        mockMvc
            .get("/api/overview/day?tagId=$tagId") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].description") { value("Reading book") }
            }
    }

    @Test
    fun `CSV export includes tags column`() {
        val aliceToken = registerAndGetToken("alice")
        val projectResult =
            mockMvc
                .post("/api/projects") {
                    header("Authorization", "Bearer $aliceToken")
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name":"Work"}"""
                }.andExpect { status { isCreated() } }
                .andReturn()
        val projectId = objectMapper.readTree(projectResult.response.contentAsString)["id"].asText()
        val tagId = createTag(aliceToken, "deep-work", "#4A90D9")
        val start = Instant.now().minusSeconds(3600)
        val end = Instant.now().minusSeconds(60)
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            startTime = start,
                            endTime = end,
                            description = "Focused",
                            projectIds = listOf(UUID.fromString(projectId)),
                            tagIds = listOf(tagId),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        val csv =
            mockMvc
                .get("/api/projects/$projectId/export") { header("Authorization", "Bearer $aliceToken") }
                .andExpect { status { isOk() } }
                .andReturn()
                .response
                .contentAsString

        assert(csv.startsWith("username,project_path,description,start_time,end_time,duration_seconds,tags")) {
            "CSV header missing tags column: $csv"
        }
        assert(csv.contains("deep-work")) { "CSV data missing tag name: $csv" }
    }
}
