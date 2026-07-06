package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.InviteMemberRequest
import com.timetracker.dto.RegisterRequest
import com.timetracker.dto.UpdateProjectRequest
import com.timetracker.repository.ProjectMemberRepository
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

    @Autowired lateinit var memberRepository: ProjectMemberRepository

    @BeforeEach
    fun cleanDb() {
        taskRepository.deleteAll()
        memberRepository.deleteAll()
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

    private fun createTask(
        token: String,
        startTime: Instant,
        endTime: Instant,
        projectIds: List<UUID> = emptyList(),
    ) {
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            startTime = startTime,
                            endTime = endTime,
                            projectIds = projectIds,
                        ),
                    )
            }.andExpect { status { isCreated() } }
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

    // ── project sharing — invite / remove ─────────────────────────────────────

    private fun inviteUser(
        ownerToken: String,
        projectId: UUID,
        inviteeUsername: String,
    ) {
        mockMvc
            .post("/api/projects/$projectId/members") {
                header("Authorization", "Bearer $ownerToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(InviteMemberRequest(username = inviteeUsername))
            }.andExpect { status { isCreated() } }
    }

    @Test
    fun `POST projects-members - 201 invites member`() {
        val aliceToken = registerAndGetToken("alice")
        registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        mockMvc
            .post("/api/projects/$id/members") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(InviteMemberRequest(username = "bob"))
            }.andExpect {
                status { isCreated() }
                jsonPath("$.username") { value("bob") }
                jsonPath("$.role") { value("MEMBER") }
            }
    }

    @Test
    fun `POST projects-members - 404 for unknown invitee`() {
        val aliceToken = registerAndGetToken("alice")
        val id = createProject(aliceToken, "Work")
        mockMvc
            .post("/api/projects/$id/members") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(InviteMemberRequest(username = "nobody"))
            }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `POST projects-members - 409 when already a member`() {
        val aliceToken = registerAndGetToken("alice")
        registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .post("/api/projects/$id/members") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(InviteMemberRequest(username = "bob"))
            }.andExpect { status { isConflict() } }
    }

    @Test
    fun `POST projects-members - 400 when inviting self`() {
        val aliceToken = registerAndGetToken("alice")
        val id = createProject(aliceToken, "Work")
        mockMvc
            .post("/api/projects/$id/members") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(InviteMemberRequest(username = "alice"))
            }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `POST projects-members - 403 when caller is member not owner`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        registerAndGetToken("carol")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .post("/api/projects/$id/members") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(InviteMemberRequest(username = "carol"))
            }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `POST projects-members - 404 when caller has no access`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        registerAndGetToken("carol")
        val id = createProject(aliceToken, "Work")
        mockMvc
            .post("/api/projects/$id/members") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(InviteMemberRequest(username = "carol"))
            }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `GET projects-members - 200 returns member list`() {
        val aliceToken = registerAndGetToken("alice")
        registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .get("/api/projects/$id/members") { header("Authorization", "Bearer $aliceToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].username") { value("bob") }
            }
    }

    @Test
    fun `GET projects-members - 200 member can view member list`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .get("/api/projects/$id/members") { header("Authorization", "Bearer $bobToken") }
            .andExpect { status { isOk() } }
    }

    @Test
    fun `GET projects-members - 404 for non-member`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        mockMvc
            .get("/api/projects/$id/members") { header("Authorization", "Bearer $bobToken") }
            .andExpect { status { isNotFound() } }
    }

    @Test
    fun `DELETE projects-members - 204 removes member`() {
        val aliceToken = registerAndGetToken("alice")
        registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        val bobUser = userRepository.findByUsername("bob")!!
        mockMvc
            .delete("/api/projects/$id/members/${bobUser.id}") {
                header("Authorization", "Bearer $aliceToken")
            }.andExpect { status { isNoContent() } }

        mockMvc
            .get("/api/projects/$id/members") { header("Authorization", "Bearer $aliceToken") }
            .andExpect { jsonPath("$.length()") { value(0) } }
    }

    @Test
    fun `DELETE projects-members - 403 when member tries to remove`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        registerAndGetToken("carol")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        inviteUser(aliceToken, id, "carol")
        val carolUser = userRepository.findByUsername("carol")!!
        mockMvc
            .delete("/api/projects/$id/members/${carolUser.id}") {
                header("Authorization", "Bearer $bobToken")
            }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `DELETE projects-members - 404 when target user is not a member`() {
        val aliceToken = registerAndGetToken("alice")
        registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        val bobUser = userRepository.findByUsername("bob")!!
        mockMvc
            .delete("/api/projects/$id/members/${bobUser.id}") {
                header("Authorization", "Bearer $aliceToken")
            }.andExpect { status { isNotFound() } }
    }

    // ── shared project access ─────────────────────────────────────────────────

    @Test
    fun `GET projects - shared project appears in member project list`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Alice Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .get("/api/projects") { header("Authorization", "Bearer $bobToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].name") { value("Alice Work") }
                jsonPath("$[0].ownerUsername") { value("alice") }
            }
    }

    @Test
    fun `GET projects id - 200 for member`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .get("/api/projects/$id") { header("Authorization", "Bearer $bobToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.name") { value("Work") }
                jsonPath("$.ownerUsername") { value("alice") }
            }
    }

    @Test
    fun `GET projects id tasks - 200 for member`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        val now = Instant.now()
        // Bob adds a task to Alice's project
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Bob's task",
                            startTime = now.minusSeconds(600),
                            endTime = now,
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        mockMvc
            .get("/api/projects/$id/tasks") { header("Authorization", "Bearer $bobToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].description") { value("Bob's task") }
            }
    }

    @Test
    fun `PUT projects id - 403 when member tries to rename`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .put("/api/projects/$id") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(UpdateProjectRequest(name = "Renamed"))
            }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `DELETE projects id - 403 when member tries to delete`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .delete("/api/projects/$id") { header("Authorization", "Bearer $bobToken") }
            .andExpect { status { isForbidden() } }
    }

    @Test
    fun `POST projects - 403 when member tries to add subproject`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(CreateProjectRequest(name = "Sub", parentId = id))
            }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `POST tasks - member can associate task with shared project`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Bob's contribution",
                            startTime = now.minusSeconds(1800),
                            endTime = now,
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect {
                status { isCreated() }
                jsonPath("$.projectIds[0]") { value(id.toString()) }
            }
    }

    @Test
    fun `POST tasks - non-member cannot associate task with project`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Unauthorized",
                            startTime = now.minusSeconds(1800),
                            endTime = now,
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `ownerUsername is included in project response`() {
        val token = registerAndGetToken("alice")
        val id = createProject(token, "My Project")
        mockMvc
            .get("/api/projects/$id") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.ownerUsername") { value("alice") }
            }
    }

    // ── M7B: shared project task overview ─────────────────────────────────────

    @Test
    fun `GET project tasks shows owner and member tasks combined`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        val now = Instant.now()
        // Alice adds a task
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Alice task",
                            startTime = now.minusSeconds(3600),
                            endTime = now.minusSeconds(1800),
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }
        // Bob adds a task
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $bobToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Bob task",
                            startTime = now.minusSeconds(900),
                            endTime = now,
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        mockMvc
            .get("/api/projects/$id/tasks") { header("Authorization", "Bearer $aliceToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(2) }
            }
    }

    @Test
    fun `GET project tasks with userId filter returns only that user's tasks`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        val now = Instant.now()
        // Alice adds a task
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Alice task",
                            startTime = now.minusSeconds(3600),
                            endTime = now.minusSeconds(1800),
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }
        // Bob adds a task
        val bobUserId =
            objectMapper
                .readTree(
                    mockMvc
                        .post("/api/tasks") {
                            header("Authorization", "Bearer $bobToken")
                            contentType = MediaType.APPLICATION_JSON
                            content =
                                objectMapper.writeValueAsString(
                                    CreateTaskRequest(
                                        description = "Bob task",
                                        startTime = now.minusSeconds(900),
                                        endTime = now,
                                        projectIds = listOf(id),
                                    ),
                                )
                        }.andExpect { status { isCreated() } }
                        .andReturn()
                        .response.contentAsString,
                ).let {
                    // Get Bob's userId from his task's ownerUsername — use members endpoint instead
                    memberRepository
                        .findAll()
                        .first { m -> m.user.username == "bob" }
                        .user.id
                }

        mockMvc
            .get("/api/projects/$id/tasks?userId=$bobUserId") { header("Authorization", "Bearer $aliceToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].description") { value("Bob task") }
            }
    }

    @Test
    fun `GET project tasks response includes ownerUsername`() {
        val aliceToken = registerAndGetToken("alice")
        val id = createProject(aliceToken, "Work")
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "My task",
                            startTime = now.minusSeconds(3600),
                            endTime = now,
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        mockMvc
            .get("/api/projects/$id/tasks") { header("Authorization", "Bearer $aliceToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$[0].ownerUsername") { value("alice") }
            }
    }

    @Test
    fun `GET project by id includes userBreakdown`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Alice task",
                            startTime = now.minusSeconds(3600),
                            endTime = now,
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        mockMvc
            .get("/api/projects/$id") { header("Authorization", "Bearer $aliceToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.userBreakdown") { isArray() }
                jsonPath("$.userBreakdown.length()") { value(1) }
                jsonPath("$.userBreakdown[0].username") { value("alice") }
            }
    }

    // ── M7B fix: members panel for subprojects ────────────────────────────────

    @Test
    fun `GET projects-members - subproject returns inherited members from parent`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val parentId = createProject(aliceToken, "Work")
        val childId = createProject(aliceToken, "Backend", parentId)
        inviteUser(aliceToken, parentId, "bob")

        mockMvc
            .get("/api/projects/$childId/members") { header("Authorization", "Bearer $bobToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
                jsonPath("$[0].username") { value("bob") }
                jsonPath("$[0].inherited") { value(true) }
            }
    }

    @Test
    fun `GET projects-members - direct member not marked inherited`() {
        val aliceToken = registerAndGetToken("alice")
        registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")

        mockMvc
            .get("/api/projects/$id/members") { header("Authorization", "Bearer $aliceToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$[0].inherited") { value(false) }
            }
    }

    // ── M7B fix: subproject visibility ────────────────────────────────────────

    @Test
    fun `GET projects - member sees subprojects of shared project`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val parentId = createProject(aliceToken, "Work")
        createProject(aliceToken, "Backend", parentId)
        inviteUser(aliceToken, parentId, "bob")

        mockMvc
            .get("/api/projects") { header("Authorization", "Bearer $bobToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(2) }
                jsonPath("$[?(@.name=='Work')]") { isNotEmpty() }
                jsonPath("$[?(@.name=='Backend')]") { isNotEmpty() }
            }
    }

    @Test
    fun `GET projects subId - 200 for member of parent project`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val parentId = createProject(aliceToken, "Work")
        val childId = createProject(aliceToken, "Backend", parentId)
        inviteUser(aliceToken, parentId, "bob")

        mockMvc
            .get("/api/projects/$childId") { header("Authorization", "Bearer $bobToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.name") { value("Backend") }
                jsonPath("$.ownerUsername") { value("alice") }
            }
    }

    @Test
    fun `GET projects subId - 404 for non-member accessing subproject`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val parentId = createProject(aliceToken, "Work")
        val childId = createProject(aliceToken, "Backend", parentId)
        // Bob is not invited

        mockMvc
            .get("/api/projects/$childId") { header("Authorization", "Bearer $bobToken") }
            .andExpect { status { isNotFound() } }
    }

    @Test
    fun `GET projects subId tasks - 200 for member accessing subproject`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val parentId = createProject(aliceToken, "Work")
        val childId = createProject(aliceToken, "Backend", parentId)
        inviteUser(aliceToken, parentId, "bob")
        val now = Instant.now()
        createTask(aliceToken, now.minusSeconds(3600), now, listOf(childId))

        mockMvc
            .get("/api/projects/$childId/tasks") { header("Authorization", "Bearer $bobToken") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
            }
    }

    // ── M7C: CSV export ────────────────────────────────────────────────────────

    @Test
    fun `GET export - 200 returns CSV with correct columns`() {
        val aliceToken = registerAndGetToken("alice")
        val id = createProject(aliceToken, "Work")
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Design work",
                            startTime = now.minusSeconds(3600),
                            endTime = now,
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        val result =
            mockMvc
                .get("/api/projects/$id/export") { header("Authorization", "Bearer $aliceToken") }
                .andExpect {
                    status { isOk() }
                    header { string("Content-Disposition", "attachment; filename=\"export.csv\"") }
                }.andReturn()

        val csv = result.response.contentAsString
        assert(csv.startsWith("username,project_path,description,start_time,end_time,duration_seconds"))
        assert(csv.contains("alice"))
        assert(csv.contains("Work"))
        assert(csv.contains("Design work"))
    }

    @Test
    fun `GET export - includes running task with blank end_time`() {
        val aliceToken = registerAndGetToken("alice")
        val id = createProject(aliceToken, "Work")
        mockMvc
            .post("/api/tasks/start") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        mapOf("description" to "Running task", "projectIds" to listOf(id)),
                    )
            }.andExpect { status { isCreated() } }

        val result =
            mockMvc
                .get("/api/projects/$id/export") { header("Authorization", "Bearer $aliceToken") }
                .andExpect { status { isOk() } }
                .andReturn()

        val csv = result.response.contentAsString
        val dataLine = csv.lines().drop(1).first { it.isNotBlank() }
        val cols = dataLine.split(",")
        assert(cols[4] == "") { "end_time should be blank for running task, was: ${cols[4]}" }
    }

    @Test
    fun `GET export - month filter includes only tasks in that month`() {
        val aliceToken = registerAndGetToken("alice")
        val id = createProject(aliceToken, "Work")
        // Task in July 2026
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "July task",
                            startTime = Instant.parse("2026-07-10T10:00:00Z"),
                            endTime = Instant.parse("2026-07-10T11:00:00Z"),
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }
        // Task in June 2026
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "June task",
                            startTime = Instant.parse("2026-06-10T10:00:00Z"),
                            endTime = Instant.parse("2026-06-10T11:00:00Z"),
                            projectIds = listOf(id),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        val result =
            mockMvc
                .get("/api/projects/$id/export?month=2026-07") { header("Authorization", "Bearer $aliceToken") }
                .andExpect { status { isOk() } }
                .andReturn()

        val csv = result.response.contentAsString
        assert(csv.contains("July task")) { "should include July task" }
        assert(!csv.contains("June task")) { "should not include June task" }
    }

    @Test
    fun `GET export - 400 for invalid month format`() {
        val aliceToken = registerAndGetToken("alice")
        val id = createProject(aliceToken, "Work")
        mockMvc
            .get("/api/projects/$id/export?month=not-a-month") { header("Authorization", "Bearer $aliceToken") }
            .andExpect { status { isBadRequest() } }
    }

    @Test
    fun `GET export - 404 for non-member`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        mockMvc
            .get("/api/projects/$id/export") { header("Authorization", "Bearer $bobToken") }
            .andExpect { status { isNotFound() } }
    }

    @Test
    fun `GET export - 200 for member`() {
        val aliceToken = registerAndGetToken("alice")
        val bobToken = registerAndGetToken("bob")
        val id = createProject(aliceToken, "Work")
        inviteUser(aliceToken, id, "bob")
        mockMvc
            .get("/api/projects/$id/export") { header("Authorization", "Bearer $bobToken") }
            .andExpect { status { isOk() } }
    }

    @Test
    fun `GET export - includes subproject tasks`() {
        val aliceToken = registerAndGetToken("alice")
        val parentId = createProject(aliceToken, "Work")
        val childId = createProject(aliceToken, "SubProject", parentId)
        val now = Instant.now()
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $aliceToken")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Child task",
                            startTime = now.minusSeconds(3600),
                            endTime = now,
                            projectIds = listOf(childId),
                        ),
                    )
            }.andExpect { status { isCreated() } }

        val result =
            mockMvc
                .get("/api/projects/$parentId/export") { header("Authorization", "Bearer $aliceToken") }
                .andExpect { status { isOk() } }
                .andReturn()

        val csv = result.response.contentAsString
        assert(csv.contains("Child task")) { "export should include subproject tasks" }
        assert(csv.contains("Work/SubProject")) { "project_path should show hierarchy" }
    }
}
