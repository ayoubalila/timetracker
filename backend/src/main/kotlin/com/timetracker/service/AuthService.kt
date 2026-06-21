package com.timetracker.service

import com.timetracker.dto.AuthResponse
import com.timetracker.dto.ChangePasswordRequest
import com.timetracker.dto.LoginRequest
import com.timetracker.dto.RegisterRequest
import com.timetracker.model.User
import com.timetracker.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
) {
    fun register(request: RegisterRequest): AuthResponse {
        if (userRepository.existsByUsername(request.username)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Username already taken")
        }
        if (userRepository.existsByEmail(request.email)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Email already registered")
        }
        val user =
            User(
                username = request.username,
                email = request.email,
                password = passwordEncoder.encode(request.password),
            )
        userRepository.save(user)
        return AuthResponse(
            token = jwtService.generateToken(user.username),
            username = user.username,
        )
    }

    fun login(request: LoginRequest): AuthResponse {
        val user =
            userRepository.findByUsername(request.username)
                ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")
        if (!passwordEncoder.matches(request.password, user.password)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")
        }
        return AuthResponse(
            token = jwtService.generateToken(user.username),
            username = user.username,
        )
    }

    fun changePassword(
        username: String,
        request: ChangePasswordRequest,
    ) {
        val user =
            userRepository.findByUsername(username)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        if (!passwordEncoder.matches(request.currentPassword, user.password)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect")
        }
        user.password = passwordEncoder.encode(request.newPassword)
        userRepository.save(user)
    }
}
