package com.timetracker.dto

import jakarta.validation.constraints.Min
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
    @field:Min(1)
    val budgetSeconds: Long? = null,
    @field:Pattern(regexp = "^(TOTAL|WEEKLY|MONTHLY)$", message = "must be TOTAL, WEEKLY, or MONTHLY")
    val budgetPeriod: String? = null,
)

data class UpdateProjectRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    @field:Size(max = 1000)
    val description: String? = null,
    @field:Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "must be a valid hex color (#RRGGBB)")
    val color: String? = null,
    @field:Min(1)
    val budgetSeconds: Long? = null,
    @field:Pattern(regexp = "^(TOTAL|WEEKLY|MONTHLY)$", message = "must be TOTAL, WEEKLY, or MONTHLY")
    val budgetPeriod: String? = null,
)

data class InviteMemberRequest(
    @field:NotBlank
    val username: String,
)

data class UserTimeBreakdown(
    val userId: UUID,
    val username: String,
    val seconds: Long,
)

data class ProjectResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val color: String?,
    val parentId: UUID?,
    val ownerUsername: String,
    val ownerUserId: UUID,
    val createdAt: Instant,
    val totalSeconds: Long = 0,
    val userBreakdown: List<UserTimeBreakdown> = emptyList(),
    val budgetSeconds: Long? = null,
    val budgetPeriod: String? = null,
    val usedSeconds: Long = 0,
    val budgetPercent: Double? = null,
)

data class MemberResponse(
    val userId: UUID,
    val username: String,
    val role: String,
    val inherited: Boolean = false,
)
