package com.timetracker.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.RegisterRequest
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
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.Instant
import java.time.ZoneOffset
import java.time.temporal.TemporalAdjusters

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OverviewControllerTest {
    @Autowired lateinit var mockMvc: MockMvc

    @Autowired lateinit var objectMapper: ObjectMapper

    @Autowired lateinit var userRepository: UserRepository

    @Autowired lateinit var taskRepository: TaskRepository

    @BeforeEach
    fun cleanDb() {
        taskRepository.deleteAll()
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

    private fun createTask(
        token: String,
        startTime: Instant,
        endTime: Instant,
    ) {
        mockMvc
            .post("/api/tasks") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content =
                    objectMapper.writeValueAsString(
                        CreateTaskRequest(
                            description = "Test task",
                            startTime = startTime,
                            endTime = endTime,
                        ),
                    )
            }.andExpect { status { isCreated() } }
    }

    // ── /api/overview/day ──────────────────────────────────────────────────────

    @Test
    fun `GET overview-day - 200 returns empty list when no tasks today`() {
        val token = registerAndGetToken()
        mockMvc
            .get("/api/overview/day") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$") { isArray() }
            }
    }

    @Test
    fun `GET overview-day - 200 returns today's tasks`() {
        val token = registerAndGetToken()
        val now = Instant.now()
        createTask(token, now.minusSeconds(3600), now.minusSeconds(1800))

        mockMvc
            .get("/api/overview/day") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
            }
    }

    @Test
    fun `GET overview-day - 401 without token`() {
        mockMvc
            .get("/api/overview/day")
            .andExpect { status { isUnauthorized() } }
    }

    // ── /api/overview/week ─────────────────────────────────────────────────────

    @Test
    fun `GET overview-week - 200 returns this week's tasks`() {
        val token = registerAndGetToken()
        val now = Instant.now()
        createTask(token, now.minusSeconds(3600), now.minusSeconds(1800))

        mockMvc
            .get("/api/overview/week") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
            }
    }

    @Test
    fun `GET overview-week - excludes tasks from previous week`() {
        val token = registerAndGetToken()
        val today = Instant.now().atZone(ZoneOffset.UTC).toLocalDate()
        val lastMonday = today.with(TemporalAdjusters.previous(java.time.DayOfWeek.MONDAY))
        val lastWeekStart = lastMonday.minusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()
        val lastWeekEnd =
            lastMonday
                .minusDays(1)
                .atTime(23, 59)
                .atZone(ZoneOffset.UTC)
                .toInstant()
        createTask(token, lastWeekStart, lastWeekEnd)

        mockMvc
            .get("/api/overview/week") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(0) }
            }
    }

    @Test
    fun `GET overview-week - 401 without token`() {
        mockMvc
            .get("/api/overview/week")
            .andExpect { status { isUnauthorized() } }
    }

    // ── /api/overview/month ────────────────────────────────────────────────────

    @Test
    fun `GET overview-month - 200 returns this month's tasks`() {
        val token = registerAndGetToken()
        val now = Instant.now()
        createTask(token, now.minusSeconds(3600), now.minusSeconds(1800))

        mockMvc
            .get("/api/overview/month") { header("Authorization", "Bearer $token") }
            .andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(1) }
            }
    }

    @Test
    fun `GET overview-month - 401 without token`() {
        mockMvc
            .get("/api/overview/month")
            .andExpect { status { isUnauthorized() } }
    }
}
