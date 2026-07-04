package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.RegisterRequest
import com.timetracker.dto.UpdateProjectRequest
import com.timetracker.repository.ProjectRepository
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
class ProjectControllerTest {
    @Autowired lateinit var mockMvc: MockMvc

    @Autowired lateinit var objectMapper: ObjectMapper

    @Autowired lateinit var userRepository: UserRepository

    @Autowired lateinit var projectRepository: ProjectRepository

    @Autowired lateinit var taskRepository: TaskRepository

    @BeforeEach
    fun cleanDb() {
        taskRepository.deleteAll()
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
                    content =
                        objectMapper.writeValueAsString(
                            RegisterRequest(username, "$username@test.com", password),
                        )
                }.andReturn()
        return objectMapper.readTree(result.response.contentAsString)["token"].asText()
    }

    private fun createProject(
        token: String,
        name: String,
        parentId: UUID? = null,
    ): UUID {
        val result =
            mockMvc
                .post("/api/projects") {
                    header("Authorization", "Bearer $token")
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(CreateProjectRequest(name = name, parentId = parentId))
                }.andExpect { status { isCreated() } }
                .andReturn()
        return UUID.fromString(objectMapper.readTree(result.response.contentAsString)["id"].asText())
    }

    @Test
    fun `GET projects - 200 returns empty list`() {
        val token = registerAndGetToken()
        mockMvc
            .get("/api/projects") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$") { isArray() }
            }
    }

    @Test
    fun `POST projects - 201 creates project`() {
        val token = registerAndGetToken()
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateProjectRequest(name = "Work"))
            }.andExpect {
                status { isCreated() }
                jsonPath("$.name") { value("Work") }
                jsonPath("$.id") { isNotEmpty() }
                jsonPath("$.parentId") { doesNotExist() }
            }
    }

    @Test
    fun `POST projects - 409 on duplicate name at same level`() {
        val token = registerAndGetToken()
        createProject(token, "Work")
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateProjectRequest(name = "Work"))
            }.andExpect { status { isConflict() } }
    }

    @Test
    fun `POST projects - 400 on blank name`() {
        val token = registerAndGetToken()
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateProjectRequest(name = ""))
            }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `POST projects - 401 without token`() {
        mockMvc
            .post("/api/projects") {
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateProjectRequest(name = "Work"))
            }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `POST projects - creates subproject under parent`() {
        val token = registerAndGetToken()
        val parentId = createProject(token, "Work")
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateProjectRequest(name = "Sub", parentId = parentId))
            }.andExpect {
                status { isCreated() }
                jsonPath("$.name") { value("Sub") }
                jsonPath("$.parentId") { value(parentId.toString()) }
            }
    }

    @Test
    fun `POST projects - 404 when parent belongs to other user`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val aliceProjectId = createProject(aliceToken, "Alice Project")
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateProjectRequest(name = "Bob Sub", parentId = aliceProjectId))
            }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `GET projects {id} - 200 returns project`() {
        val token = registerAndGetToken()
        val id = createProject(token, "Work")
        mockMvc
            .get("/api/projects/$id") {
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id.toString()) }
                jsonPath("$.name") { value("Work") }
            }
    }

    @Test
    fun `GET projects {id} - 404 for other user's project`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Alice Project")
        mockMvc
            .get("/api/projects/$id") {
                header("Authorization", "Bearer $bobToken")
            }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `PUT projects {id} - 200 renames project`() {
        val token = registerAndGetToken()
        val id = createProject(token, "Work")
        mockMvc
            .put("/api/projects/$id") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(UpdateProjectRequest(name = "Renamed"))
            }.andExpect {
                status { isOk() }
                jsonPath("$.name") { value("Renamed") }
            }
    }

    @Test
    fun `PUT projects {id} - 409 on name conflict`() {
        val token = registerAndGetToken()
        createProject(token, "Work")
        val id = createProject(token, "Personal")
        mockMvc
            .put("/api/projects/$id") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(UpdateProjectRequest(name = "Work"))
            }.andExpect { status { isConflict() } }
    }

    @Test
    fun `DELETE projects {id} - 204 removes project`() {
        val token = registerAndGetToken()
        val id = createProject(token, "Work")
        mockMvc
            .delete("/api/projects/$id") {
                header("Authorization", "Bearer $token")
            }.andExpect { status { isNoContent() } }

        mockMvc
            .get("/api/projects/$id") {
                header("Authorization", "Bearer $token")
            }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `DELETE projects {id} - 404 for other user's project`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Alice Project")
        mockMvc
            .delete("/api/projects/$id") {
                header("Authorization", "Bearer $bobToken")
            }.andExpect { status { isNotFound() } }
    }

    // ── totalSeconds ───────────────────────────────────────────────────────────

    @Test
    fun `GET projects {id} - totalSeconds is 0 for project with no tasks`() {
        val token = registerAndGetToken()
        val id = createProject(token, "Work")
        mockMvc
            .get("/api/projects/$id") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.totalSeconds") { value(0) }
            }
    }

    @Test
    fun `GET projects {id} - totalSeconds reflects completed task duration`() {
        val token = registerAndGetToken()
        val id = createProject(token, "Work")
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Task",
                            startTime = now.minusSeconds(3600),
                            endTime = now.minusSeconds(1800),
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        mockMvc
            .get("/api/projects/$id") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                // 1800 seconds between start and end
                jsonPath("$.totalSeconds") { value(1800) }
            }
    }

    @Test
    fun `GET projects {id} - totalSeconds includes subproject tasks`() {
        val token = registerAndGetToken()
        val parentId = createProject(token, "Work")
        val childId = createProject(token, "Sub", parentId)
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Child task",
                            startTime = now.minusSeconds(600),
                            endTime = now.minusSeconds(0),
                            projectIds = listOf(childId),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        mockMvc
            .get("/api/projects/$parentId") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.totalSeconds") { value(600) }
            }
    }

    // ── GET /api/projects/{id}/tasks ───────────────────────────────────────────

    @Test
    fun `GET project tasks - 200 returns tasks associated with project`() {
        val token = registerAndGetToken()
        val projId = createProject(token, "Work")
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "My task",
                            startTime = now.minusSeconds(3600),
                            endTime = now,
                            projectIds = listOf(projId),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        mockMvc
            .get("/api/projects/$projId/tasks") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].description") { value("My task") }
            }
    }

    @Test
    fun `GET project tasks - 200 returns empty when project has no tasks`() {
        val token = registerAndGetToken()
        val projId = createProject(token, "Work")
        mockMvc
            .get("/api/projects/$projId/tasks") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(0) }
            }
    }

    @Test
    fun `GET project tasks - 404 for other user's project`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Alice Project")
        mockMvc
            .get("/api/projects/$id/tasks") { header("Authorization", "Bearer $bobToken") }
            .andExpect { status { isNotFound() } }
    }
}
