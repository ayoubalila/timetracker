package com.timetracker.controller

import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.StartTaskRequest
import com.timetracker.dto.TaskResponse
import com.timetracker.dto.UpdateTaskRequest
import com.timetracker.service.TaskService
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
@RequestMapping("/api/tasks")
class TaskController(
    private val taskService: TaskService,
) {
    @GetMapping
    fun listAll(
        @AuthenticationPrincipal username: String,
        @RequestParam(required = false) from: Instant?,
        @RequestParam(required = false) to: Instant?,
    ): ResponseEntity<List<TaskResponse>> = ResponseEntity.ok(taskService.listAll(username, from, to))

    @PostMapping("/start")
    fun start(
        @AuthenticationPrincipal username: String,
        @Valid @RequestBody request: StartTaskRequest,
    ): ResponseEntity<TaskResponse> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(taskService.start(username, request))

    @GetMapping("/current")
    fun getCurrent(
        @AuthenticationPrincipal username: String,
    ): ResponseEntity<TaskResponse> {
        val task = taskService.getCurrent(username)
        return if (task != null) ResponseEntity.ok(task) else ResponseEntity.noContent().build()
    }

    @PostMapping
    fun create(
        @AuthenticationPrincipal username: String,
        @Valid @RequestBody request: CreateTaskRequest,
    ): ResponseEntity<TaskResponse> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(taskService.create(username, request))

    @GetMapping("/{id}")
    fun getById(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
    ): ResponseEntity<TaskResponse> = ResponseEntity.ok(taskService.getById(username, id))

    @PostMapping("/{id}/stop")
    fun stop(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
    ): ResponseEntity<TaskResponse> = ResponseEntity.ok(taskService.stop(username, id))

    @PutMapping("/{id}")
    fun update(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateTaskRequest,
    ): ResponseEntity<TaskResponse> = ResponseEntity.ok(taskService.update(username, id, request))

    @DeleteMapping("/{id}")
    fun delete(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
    ): ResponseEntity<Void> {
        taskService.delete(username, id)
        return ResponseEntity.noContent().build()
    }
}
