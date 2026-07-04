package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.dto.RegisterRequest
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
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ValidationTest {
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

    // ── RFC 7807 Problem Detail format ──────────────────────────────────────────

    @Test
    fun `validation error returns 400 with application-problem+json`() {
        mockMvc
            .post("/api/auth/register") {
                contentType = MediaType.APPLICATION_JSON
                content = """{"username":"","email":"not-an-email","password":"short"}"""
            }.andExpect {
                status { isBadRequest() }
                content { contentType(MediaType.APPLICATION_PROBLEM_JSON) }
                jsonPath("$.status") { value(400) }
                jsonPath("$.errors") { isMap() }
            }
    }

    @Test
    fun `validation error body contains field-level errors`() {
        mockMvc
            .post("/api/auth/register") {
                contentType = MediaType.APPLICATION_JSON
                content = """{"username":"","email":"notanemail","password":"short"}"""
            }.andExpect {
                status { isBadRequest() }
                jsonPath("$.errors.username") { isString() }
                jsonPath("$.errors.email") { isString() }
                jsonPath("$.errors.password") { isString() }
            }
    }

    @Test
    fun `malformed JSON body returns 400 with application-problem+json`() {
        mockMvc
            .post("/api/auth/register") {
                contentType = MediaType.APPLICATION_JSON
                content = """{"username": "alice", "email":}"""
            }.andExpect {
                status { isBadRequest() }
                content { contentType(MediaType.APPLICATION_PROBLEM_JSON) }
                jsonPath("$.detail") { value("Malformed request body") }
            }
    }

    @Test
    fun `project create - blank name returns 400 with errors`() {
        val token = registerAndGetToken()
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = """{"name":""}"""
            }.andExpect {
                status { isBadRequest() }
                jsonPath("$.errors.name") { isString() }
            }
    }

    @Test
    fun `project create - invalid color format returns 400`() {
        val token = registerAndGetToken()
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = """{"name":"Work","color":"red"}"""
            }.andExpect {
                status { isBadRequest() }
                jsonPath("$.errors.color") { isString() }
            }
    }

    @Test
    fun `project create - valid hex color is accepted`() {
        val token = registerAndGetToken()
        mockMvc
            .post("/api/projects") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = """{"name":"Work","color":"#FF5733"}"""
            }.andExpect {
                status { isCreated() }
            }
    }

    @Test
    fun `task start - description over 500 chars returns 400`() {
        val token = registerAndGetToken()
        val longDesc = "a".repeat(501)
        mockMvc
            .post("/api/tasks/start") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = """{"description":"$longDesc"}"""
            }.andExpect {
                status { isBadRequest() }
                jsonPath("$.errors.description") { isString() }
            }
    }

    @Test
    fun `change password - short new password returns 400`() {
        val token = registerAndGetToken()
        mockMvc
            .put("/api/auth/password") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = """{"currentPassword":"password1","newPassword":"short"}"""
            }.andExpect {
                status { isBadRequest() }
                jsonPath("$.errors.newPassword") { isString() }
            }
    }
}
