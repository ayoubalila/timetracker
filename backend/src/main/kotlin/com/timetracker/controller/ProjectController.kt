package com.timetracker.controller

import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.ProjectResponse
import com.timetracker.dto.UpdateProjectRequest
import com.timetracker.service.ProjectService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/projects")
class ProjectController(
    private val projectService: ProjectService,
) {
    @GetMapping
    fun getAll(
        @AuthenticationPrincipal username: String,
    ): ResponseEntity<List<ProjectResponse>> = ResponseEntity.ok(projectService.getAll(username))

    @PostMapping
    fun create(
        @AuthenticationPrincipal username: String,
        @Valid @RequestBody request: CreateProjectRequest,
    ): ResponseEntity<ProjectResponse> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(projectService.create(username, request))

    @GetMapping("/{id}")
    fun getById(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
    ): ResponseEntity<ProjectResponse> = ResponseEntity.ok(projectService.getById(username, id))

    @PutMapping("/{id}")
    fun update(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateProjectRequest,
    ): ResponseEntity<ProjectResponse> = ResponseEntity.ok(projectService.update(username, id, request))

    @DeleteMapping("/{id}")
    fun delete(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
    ): ResponseEntity<Void> {
        projectService.delete(username, id)
        return ResponseEntity.noContent().build()
    }
}
