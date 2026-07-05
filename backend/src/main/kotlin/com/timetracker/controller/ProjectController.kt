package com.timetracker.controller

import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.InviteMemberRequest
import com.timetracker.dto.MemberResponse
import com.timetracker.dto.ProjectResponse
import com.timetracker.dto.TaskResponse
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
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
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
        @RequestParam(required = false) from: Instant?,
        @RequestParam(required = false) to: Instant?,
    ): ResponseEntity<ProjectResponse> = ResponseEntity.ok(projectService.getById(username, id, from, to))

    @GetMapping("/{id}/tasks")
    fun getProjectTasks(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
        @RequestParam(required = false) from: Instant?,
        @RequestParam(required = false) to: Instant?,
        @RequestParam(required = false) userId: UUID?,
    ): ResponseEntity<List<TaskResponse>> = ResponseEntity.ok(projectService.getProjectTasks(username, id, from, to, userId))

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

    // ── member management ──────────────────────────────────────────────────────

    @GetMapping("/{id}/members")
    fun getMembers(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
    ): ResponseEntity<List<MemberResponse>> = ResponseEntity.ok(projectService.getMembers(username, id))

    @PostMapping("/{id}/members")
    fun inviteMember(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: InviteMemberRequest,
    ): ResponseEntity<MemberResponse> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(projectService.inviteMember(username, id, request))

    @DeleteMapping("/{id}/members/{userId}")
    fun removeMember(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
        @PathVariable userId: UUID,
    ): ResponseEntity<Void> {
        projectService.removeMember(username, id, userId)
        return ResponseEntity.noContent().build()
    }
}
