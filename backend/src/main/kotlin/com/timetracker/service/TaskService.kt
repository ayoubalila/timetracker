package com.timetracker.service

import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.StartTaskRequest
import com.timetracker.dto.TaskResponse
import com.timetracker.dto.UpdateTaskRequest
import com.timetracker.model.Project
import com.timetracker.model.Task
import com.timetracker.model.User
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.TaskRepository
import com.timetracker.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

@Service
class TaskService(
    private val taskRepository: TaskRepository,
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
) {
    fun listAll(
        username: String,
        from: Instant?,
        to: Instant?,
    ): List<TaskResponse> {
        val owner = requireUser(username)
        return if (from != null && to != null) {
            taskRepository.findByOwnerAndTimeRange(owner, from, to)
        } else {
            taskRepository.findAllByOwnerOrderByStartTimeDesc(owner)
        }.map { it.toResponse() }
    }

    fun getCurrent(username: String): TaskResponse? {
        val owner = requireUser(username)
        return taskRepository.findByOwnerAndEndTimeIsNull(owner)?.toResponse()
    }

    fun start(
        username: String,
        request: StartTaskRequest,
    ): TaskResponse {
        val owner = requireUser(username)
        if (taskRepository.existsByOwnerAndEndTimeIsNull(owner)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "A task is already running")
        }
        val projects = resolveProjects(request.projectIds, owner)
        val task =
            Task(
                description = request.description,
                startTime = Instant.now(),
                owner = owner,
                projects = projects,
            )
        return taskRepository.save(task).toResponse()
    }

    fun stop(
        username: String,
        id: UUID,
    ): TaskResponse {
        val task = requireTask(username, id)
        if (task.endTime != null) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task is already stopped")
        }
        task.endTime = Instant.now()
        task.updatedAt = Instant.now()
        return taskRepository.save(task).toResponse()
    }

    fun create(
        username: String,
        request: CreateTaskRequest,
    ): TaskResponse {
        val owner = requireUser(username)
        if (request.endTime != null && !request.endTime.isAfter(request.startTime)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime")
        }
        if (request.endTime == null && taskRepository.existsByOwnerAndEndTimeIsNull(owner)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "A task is already running")
        }
        val projects = resolveProjects(request.projectIds, owner)
        val task =
            Task(
                description = request.description,
                startTime = request.startTime,
                endTime = request.endTime,
                owner = owner,
                projects = projects,
            )
        return taskRepository.save(task).toResponse()
    }

    fun getById(
        username: String,
        id: UUID,
    ): TaskResponse = requireTask(username, id).toResponse()

    fun update(
        username: String,
        id: UUID,
        request: UpdateTaskRequest,
    ): TaskResponse {
        val owner = requireUser(username)
        val task = requireTask(username, id)
        if (request.endTime != null && !request.endTime.isAfter(request.startTime)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime")
        }
        val projects = resolveProjects(request.projectIds, owner)
        task.description = request.description
        task.startTime = request.startTime
        task.endTime = request.endTime
        task.projects = projects
        task.updatedAt = Instant.now()
        return taskRepository.save(task).toResponse()
    }

    fun delete(
        username: String,
        id: UUID,
    ) {
        val task = requireTask(username, id)
        taskRepository.delete(task)
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private fun requireUser(username: String): User =
        userRepository.findByUsername(username)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")

    private fun requireTask(
        username: String,
        id: UUID,
    ): Task {
        val owner = requireUser(username)
        return taskRepository.findByIdAndOwner(id, owner)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found")
    }

    private fun resolveProjects(
        projectIds: List<UUID>,
        owner: User,
    ): MutableSet<Project> {
        if (projectIds.isEmpty()) return mutableSetOf()
        return projectIds
            .map { pid ->
                projectRepository.findByIdAndOwner(pid, owner)
                    ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project $pid not found")
            }.toMutableSet()
    }
}

fun Task.toResponse(): TaskResponse =
    TaskResponse(
        id = id,
        description = description,
        startTime = startTime,
        endTime = endTime,
        projectIds = projects.map { it.id },
        createdAt = createdAt,
        updatedAt = updatedAt,
    )
