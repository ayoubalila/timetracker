package com.timetracker.unit

import com.timetracker.dto.ChangePasswordRequest
import com.timetracker.dto.LoginRequest
import com.timetracker.dto.RegisterRequest
import com.timetracker.dto.SetTimezoneRequest
import com.timetracker.model.User
import com.timetracker.repository.UserRepository
import com.timetracker.service.AuthService
import com.timetracker.service.JwtService
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.server.ResponseStatusException
import kotlin.test.assertEquals

class AuthServiceTest {
    private val userRepository: UserRepository = mock()
    private val passwordEncoder: PasswordEncoder = mock()
    private val jwtService: JwtService = mock()
    private val authService = AuthService(userRepository, passwordEncoder, jwtService)

    @Test
    fun `register - success returns token and default timezone`() {
        whenever(userRepository.existsByUsername("alice")).thenReturn(false)
        whenever(userRepository.existsByEmail("alice@test.com")).thenReturn(false)
        whenever(passwordEncoder.encode("password1")).thenReturn("hashed")
        // save() return value is not used in service — return dummy to avoid NPE on non-null type
        whenever(userRepository.save(any<User>())).thenReturn(
            User(username = "alice", email = "alice@test.com", password = "hashed"),
        )
        whenever(jwtService.generateToken("alice")).thenReturn("jwt-token")

        val result = authService.register(RegisterRequest("alice", "alice@test.com", "password1"))

        assertEquals("jwt-token", result.token)
        assertEquals("alice", result.username)
        assertEquals("UTC", result.timezone)
        verify(userRepository).save(any<User>())
    }

    @Test
    fun `register - duplicate username throws 409`() {
        whenever(userRepository.existsByUsername("alice")).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                authService.register(RegisterRequest("alice", "alice@test.com", "password1"))
            }
        assertEquals(409, ex.statusCode.value())
    }

    @Test
    fun `register - duplicate email throws 409`() {
        whenever(userRepository.existsByUsername("alice")).thenReturn(false)
        whenever(userRepository.existsByEmail("alice@test.com")).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                authService.register(RegisterRequest("alice", "alice@test.com", "password1"))
            }
        assertEquals(409, ex.statusCode.value())
    }

    @Test
    fun `login - valid credentials returns token and timezone`() {
        val user = User(username = "alice", email = "alice@test.com", password = "hashed", timezone = "Europe/Berlin")
        whenever(userRepository.findByUsername("alice")).thenReturn(user)
        whenever(passwordEncoder.matches("password1", "hashed")).thenReturn(true)
        whenever(jwtService.generateToken("alice")).thenReturn("jwt-token")

        val result = authService.login(LoginRequest("alice", "password1"))

        assertEquals("jwt-token", result.token)
        assertEquals("Europe/Berlin", result.timezone)
    }

    @Test
    fun `login - unknown user throws 401`() {
        whenever(userRepository.findByUsername("ghost")).thenReturn(null)

        val ex =
            assertThrows<ResponseStatusException> {
                authService.login(LoginRequest("ghost", "password1"))
            }
        assertEquals(401, ex.statusCode.value())
    }

    @Test
    fun `login - wrong password throws 401`() {
        val user = User(username = "alice", email = "alice@test.com", password = "hashed")
        whenever(userRepository.findByUsername("alice")).thenReturn(user)
        whenever(passwordEncoder.matches("wrong", "hashed")).thenReturn(false)

        val ex =
            assertThrows<ResponseStatusException> {
                authService.login(LoginRequest("alice", "wrong"))
            }
        assertEquals(401, ex.statusCode.value())
    }

    @Test
    fun `changePassword - success updates password`() {
        val user = User(username = "alice", email = "alice@test.com", password = "hashed")
        whenever(userRepository.findByUsername("alice")).thenReturn(user)
        whenever(passwordEncoder.matches("password1", "hashed")).thenReturn(true)
        whenever(passwordEncoder.encode("newpassword")).thenReturn("newHashed")
        whenever(userRepository.save(any<User>())).thenReturn(user)

        authService.changePassword("alice", ChangePasswordRequest("password1", "newpassword"))

        verify(userRepository).save(any<User>())
        assertEquals("newHashed", user.password)
    }

    @Test
    fun `changePassword - wrong current password throws 400`() {
        val user = User(username = "alice", email = "alice@test.com", password = "hashed")
        whenever(userRepository.findByUsername("alice")).thenReturn(user)
        whenever(passwordEncoder.matches("wrong", "hashed")).thenReturn(false)

        val ex =
            assertThrows<ResponseStatusException> {
                authService.changePassword("alice", ChangePasswordRequest("wrong", "newpassword"))
            }
        assertEquals(400, ex.statusCode.value())
    }

    @Test
    fun `setTimezone - valid timezone updates user`() {
        val user = User(username = "alice", email = "alice@test.com", password = "hashed")
        whenever(userRepository.findByUsername("alice")).thenReturn(user)
        whenever(userRepository.save(any<User>())).thenReturn(user)

        authService.setTimezone("alice", SetTimezoneRequest("Europe/Berlin"))

        verify(userRepository).save(any<User>())
        assertEquals("Europe/Berlin", user.timezone)
    }

    @Test
    fun `setTimezone - invalid timezone throws 400`() {
        val user = User(username = "alice", email = "alice@test.com", password = "hashed")
        whenever(userRepository.findByUsername("alice")).thenReturn(user)

        val ex =
            assertThrows<ResponseStatusException> {
                authService.setTimezone("alice", SetTimezoneRequest("Not/ATimezone"))
            }
        assertEquals(400, ex.statusCode.value())
    }
}
