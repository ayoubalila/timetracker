package com.timetracker.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

data class CreateProjectRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    @field:Size(max = 1000)
    val description: String? = null,
    @field:Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "must be a valid hex color (#RRGGBB)")
    val color: String? = null,
    val parentId: UUID? = null,
)

data class UpdateProjectRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    @field:Size(max = 1000)
    val description: String? = null,
    @field:Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "must be a valid hex color (#RRGGBB)")
    val color: String? = null,
)

data class InviteMemberRequest(
    @field:NotBlank
    val username: String,
)

data class ProjectResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val color: String?,
    val parentId: UUID?,
    val ownerUsername: String,
    val createdAt: Instant,
    val totalSeconds: Long = 0,
)

data class MemberResponse(
    val userId: UUID,
    val username: String,
    val role: String,
)
