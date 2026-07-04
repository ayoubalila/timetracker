package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.config.RateLimitFilter
import com.timetracker.dto.RegisterRequest
import com.timetracker.repository.UserRepository
import jakarta.servlet.FilterChain
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CorsAndRateLimitTest {
    @Autowired lateinit var mockMvc: MockMvc

    @Autowired lateinit var objectMapper: ObjectMapper

    @Autowired lateinit var userRepository: UserRepository

    @BeforeEach
    fun cleanDb() {
        userRepository.deleteAll()
    }

    // ── CORS ────────────────────────────────────────────────────────────────────

    @Test
    fun `GET request from allowed origin carries Access-Control-Allow-Origin header`() {
        // Register and get a token, then make a request with Origin header
        val result =
            mockMvc
                .post("/api/auth/register") {
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(RegisterRequest("corsuser", "cors@test.com", "password1"))
                }.andExpect { status { isCreated() } }
                .andReturn()
        val token = objectMapper.readTree(result.response.contentAsString)["token"].asText()

        mockMvc
            .get("/api/tasks") {
                header("Origin", "http://localhost:5173")
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isOk() }
                header { string("Access-Control-Allow-Origin", "http://localhost:5173") }
            }
    }

    @Test
    fun `GET request from disallowed origin is rejected by CORS filter`() {
        val result =
            mockMvc
                .post("/api/auth/register") {
                    contentType = MediaType.APPLICATION_JSON
                    content = objectMapper.writeValueAsString(RegisterRequest("corsuser2", "cors2@test.com", "password1"))
                }.andExpect { status { isCreated() } }
                .andReturn()
        val token = objectMapper.readTree(result.response.contentAsString)["token"].asText()

        // Spring's CorsFilter returns 403 for simple requests from disallowed origins
        mockMvc
            .get("/api/tasks") {
                header("Origin", "http://evil.example.com")
                header("Authorization", "Bearer $token")
            }.andExpect {
                status { isForbidden() }
            }
    }

    // ── Rate limiting (unit tests — filter logic, no shared Spring context state) ─

    @Test
    fun `rate limit filter allows requests up to the configured max`() {
        val filter = RateLimitFilter(maxRequests = 3, windowMs = 60_000)
        val chain = mock<FilterChain>()

        repeat(3) {
            val req = MockHttpServletRequest()
            req.method = "POST"
            req.requestURI = "/api/auth/login"
            req.remoteAddr = "1.2.3.4"
            val res = MockHttpServletResponse()
            filter.doFilter(req, res, chain)
            assertEquals(200, res.status)
        }
    }

    @Test
    fun `rate limit filter returns 429 on the request exceeding the limit`() {
        val filter = RateLimitFilter(maxRequests = 2, windowMs = 60_000)
        val chain = mock<FilterChain>()

        repeat(2) {
            val req = MockHttpServletRequest()
            req.method = "POST"
            req.requestURI = "/api/auth/login"
            req.remoteAddr = "5.6.7.8"
            filter.doFilter(req, MockHttpServletResponse(), chain)
        }

        val req = MockHttpServletRequest()
        req.method = "POST"
        req.requestURI = "/api/auth/login"
        req.remoteAddr = "5.6.7.8"
        val res = MockHttpServletResponse()
        filter.doFilter(req, res, chain)

        assertEquals(429, res.status)
    }

    @Test
    fun `rate limit filter does not count non-auth requests`() {
        val filter = RateLimitFilter(maxRequests = 1, windowMs = 60_000)
        val chain = mock<FilterChain>()

        val req = MockHttpServletRequest()
        req.method = "GET"
        req.requestURI = "/api/tasks"
        req.remoteAddr = "9.9.9.9"
        val res = MockHttpServletResponse()
        filter.doFilter(req, res, chain)

        // chain.doFilter should have been called (not short-circuited)
        verify(chain).doFilter(req, res)
        assertEquals(200, res.status)
    }

    @Test
    fun `rate limit filter tracks IPs independently`() {
        val filter = RateLimitFilter(maxRequests = 1, windowMs = 60_000)
        val chain = mock<FilterChain>()

        // Exhaust limit for IP A
        val reqA = MockHttpServletRequest()
        reqA.requestURI = "/api/auth/login"
        reqA.remoteAddr = "10.0.0.1"
        filter.doFilter(reqA, MockHttpServletResponse(), chain)

        // IP B should still be allowed
        val reqB = MockHttpServletRequest()
        reqB.requestURI = "/api/auth/login"
        reqB.remoteAddr = "10.0.0.2"
        val resB = MockHttpServletResponse()
        filter.doFilter(reqB, resB, chain)

        assertEquals(200, resB.status)
    }

    @Test
    fun `rate limit filter chain not called when limit exceeded`() {
        val filter = RateLimitFilter(maxRequests = 1, windowMs = 60_000)
        val chain = mock<FilterChain>()

        val ip = "11.22.33.44"
        // First request — within limit
        val req1 =
            MockHttpServletRequest().also {
                it.requestURI = "/api/auth/register"
                it.remoteAddr = ip
            }
        filter.doFilter(req1, MockHttpServletResponse(), chain)

        // Second request — exceeds limit; chain should NOT be called
        val req2 =
            MockHttpServletRequest().also {
                it.requestURI = "/api/auth/register"
                it.remoteAddr = ip
            }
        val res2 = MockHttpServletResponse()
        filter.doFilter(req2, res2, chain)

        verify(chain, never()).doFilter(req2, res2)
        assertEquals(429, res2.status)
    }
}
