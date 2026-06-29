package com.timetracker.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

data class CreateProjectRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val parentId: UUID? = null,
)

data class UpdateProjectRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val name: String,
    val description: String? = null,
    val color: String? = null,
)

data class ProjectResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val color: String?,
    val parentId: UUID?,
    val createdAt: Instant,
)
