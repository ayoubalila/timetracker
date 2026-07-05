package com.timetracker.dto

import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

data class StartTaskRequest(
    @field:Size(max = 500) val description: String? = null,
    val projectIds: List<UUID> = emptyList(),
)

data class CreateTaskRequest(
    @field:Size(max = 500) val description: String? = null,
    @field:NotNull val startTime: Instant,
    val endTime: Instant? = null,
    val projectIds: List<UUID> = emptyList(),
)

data class UpdateTaskRequest(
    @field:Size(max = 500) val description: String? = null,
    @field:NotNull val startTime: Instant,
    val endTime: Instant? = null,
    val projectIds: List<UUID> = emptyList(),
)

data class TaskResponse(
    val id: UUID,
    val description: String?,
    val startTime: Instant,
    val endTime: Instant?,
    val projectIds: List<UUID>,
    val ownerUsername: String,
    val createdAt: Instant,
    val updatedAt: Instant,
)
