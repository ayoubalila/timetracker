package com.timetracker.controller

import com.timetracker.dto.AuthResponse
import com.timetracker.dto.ChangePasswordRequest
import com.timetracker.dto.LoginRequest
import com.timetracker.dto.MessageResponse
import com.timetracker.dto.RegisterRequest
import com.timetracker.dto.SetTimezoneRequest
import com.timetracker.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
) {
    @PostMapping("/register")
    fun register(
        @Valid @RequestBody request: RegisterRequest,
    ): ResponseEntity<AuthResponse> = ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request))

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
    ): ResponseEntity<AuthResponse> = ResponseEntity.ok(authService.login(request))

    @PostMapping("/logout")
    fun logout(): ResponseEntity<MessageResponse> = ResponseEntity.ok(MessageResponse("Logged out successfully"))

    @PutMapping("/password")
    fun changePassword(
        @AuthenticationPrincipal username: String,
        @Valid @RequestBody request: ChangePasswordRequest,
    ): ResponseEntity<MessageResponse> {
        authService.changePassword(username, request)
        return ResponseEntity.ok(MessageResponse("Password changed successfully"))
    }

    @PutMapping("/timezone")
    fun setTimezone(
        @AuthenticationPrincipal username: String,
        @Valid @RequestBody request: SetTimezoneRequest,
    ): ResponseEntity<MessageResponse> = ResponseEntity.ok(authService.setTimezone(username, request))
}
