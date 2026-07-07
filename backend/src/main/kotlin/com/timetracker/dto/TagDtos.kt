package com.timetracker.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.util.UUID

data class TagResponse(
    val id: UUID,
    val name: String,
    val color: String,
)

data class CreateTagRequest(
    @field:NotBlank
    @field:Size(max = 50)
    val name: String,
    @field:NotBlank
    @field:Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "color must be a valid hex color (#RRGGBB)")
    val color: String,
)
