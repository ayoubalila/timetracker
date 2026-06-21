package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.dto.ChangePasswordRequest
import com.timetracker.dto.LoginRequest
import com.timetracker.dto.RegisterRequest
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
class AuthControllerTest {
    @Autowired lateinit var mockMvc: MockMvc

    @Autowired lateinit var objectMapper: ObjectMapper

    @Autowired lateinit var userRepository: UserRepository

    @BeforeEach
    fun cleanDb() {
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
        val body = objectMapper.readTree(result.response.contentAsString)
        return body["token"].asText()
    }

    @Test
    fun `POST register - 201 with token`() {
        mockMvc
            .post("/api/auth/register") {
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        RegisterRequest("alice", "alice@test.com", "password1"),
                    )
            }.andExpect {
                status { isCreated() }
                jsonPath("$.token") { isNotEmpty() }
                jsonPath("$.username") { value("alice") }
            }
    }

    @Test
    fun `POST register - 409 on duplicate username`() {
        registerAndGetToken("alice")
        mockMvc
            .post("/api/auth/register") {
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        RegisterRequest("alice", "alice2@test.com", "password1"),
                    )
            }.andExpect { status { isConflict() } }
    }

    @Test
    fun `POST register - 400 on invalid input`() {
        mockMvc
            .post("/api/auth/register") {
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        RegisterRequest("", "notanemail", "short"),
                    )
            }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `POST login - 200 with token`() {
        registerAndGetToken("alice")
        mockMvc
            .post("/api/auth/login") {
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(LoginRequest("alice", "password1"))
            }.andExpect {
                status { isOk() }
                jsonPath("$.token") { isNotEmpty() }
            }
    }

    @Test
    fun `POST login - 401 on wrong password`() {
        registerAndGetToken("alice")
        mockMvc
            .post("/api/auth/login") {
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(LoginRequest("alice", "wrongpassword"))
            }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `POST logout - 200 always`() {
        val token = registerAndGetToken("alice")
        mockMvc
            .post("/api/auth/logout") {
                header("Authorization", "Bearer $token")
            }.andExpect { status { isOk() } }
    }

    @Test
    fun `PUT password - 200 on correct current password`() {
        val token = registerAndGetToken("alice", "password1")
        mockMvc
            .put("/api/auth/password") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        ChangePasswordRequest("password1", "newpassword1"),
                    )
            }.andExpect { status { isOk() } }

        // Verify new password works for login
        mockMvc
            .post("/api/auth/login") {
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(LoginRequest("alice", "newpassword1"))
            }.andExpect { status { isOk() } }
    }

    @Test
    fun `PUT password - 400 on wrong current password`() {
        val token = registerAndGetToken("alice", "password1")
        mockMvc
            .put("/api/auth/password") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        ChangePasswordRequest("wrongpassword", "newpassword1"),
                    )
            }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `protected endpoint - 403 without token`() {
        mockMvc
            .post("/api/auth/logout")
            .andExpect { status { isForbidden() } }
    }
}
