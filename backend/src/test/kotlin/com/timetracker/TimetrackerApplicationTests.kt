package com.timetracker

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

@SpringBootTest
@ActiveProfiles("test")
class TimetrackerApplicationTests {
    @Test
    fun contextLoads() {
        // Verifies that the Spring application context starts successfully
        // with the H2 in-memory test profile (no PostgreSQL required).
    }
}
