package com.timetracker.unit

import com.timetracker.config.JwtProperties
import com.timetracker.service.JwtService
import org.junit.jupiter.api.Test
import java.util.Base64
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class JwtServiceTest {
    private val secret =
        Base64.getEncoder().encodeToString(
            "testSecretKeyForJwtTestingPurposes123456".toByteArray(),
        )
    private val jwtService = JwtService(JwtProperties(secret = secret, expirationMs = 3_600_000))

    @Test
    fun `generateToken produces a valid token`() {
        val token = jwtService.generateToken("alice")
        assertTrue(token.isNotBlank())
        assertTrue(jwtService.isTokenValid(token))
    }

    @Test
    fun `extractUsername returns the subject`() {
        val token = jwtService.generateToken("alice")
        assertEquals("alice", jwtService.extractUsername(token))
    }

    @Test
    fun `isTokenValid returns false for garbage`() {
        assertFalse(jwtService.isTokenValid("not.a.token"))
    }

    @Test
    fun `isTokenValid returns false for expired token`() {
        val expiredService = JwtService(JwtProperties(secret = secret, expirationMs = -1000))
        val token = expiredService.generateToken("alice")
        assertFalse(jwtService.isTokenValid(token))
    }
}
