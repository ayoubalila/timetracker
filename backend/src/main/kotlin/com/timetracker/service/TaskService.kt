package com.timetracker.service

import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.StartTaskRequest
import com.timetracker.dto.TagResponse
import com.timetracker.dto.TaskResponse
import com.timetracker.dto.UpdateTaskRequest
import com.timetracker.model.Project
import com.timetracker.model.Tag
import com.timetracker.model.Task
import com.timetracker.model.User
import com.timetracker.repository.ProjectMemberRepository
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.TagRepository
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
    private val memberRepository: ProjectMemberRepository,
    private val tagRepository: TagRepository,
) {
    fun listAll(
        username: String,
        from: Instant?,
        to: Instant?,
        tagId: UUID? = null,
    ): List<TaskResponse> {
        val owner = requireUser(username)
        val tag = tagId?.let { requireTag(it, owner) }
        return if (tag != null) {
            if (from != null && to != null) {
                taskRepository.findByOwnerAndTimeRangeAndTag(owner, from, to, tag)
            } else {
                taskRepository.findAllByOwnerAndTagOrderByStartTimeDesc(owner, tag)
            }
        } else {
            if (from != null && to != null) {
                taskRepository.findByOwnerAndTimeRange(owner, from, to)
            } else {
                taskRepository.findAllByOwnerOrderByStartTimeDesc(owner)
            }
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
        val tags = resolveTags(request.tagIds, owner)
        val task =
            Task(
                description = request.description,
                startTime = Instant.now(),
                owner = owner,
                projects = projects,
                tags = tags,
            )
        return taskRepository.save(task).toResponse()
    }

    fun stop(
        username: String,
        id: UUID,
    ): TaskResponse {
        val task = requireTask(username, id)
        if (task.endTime != null) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Task is already stopped")
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
        val tags = resolveTags(request.tagIds, owner)
        val task =
            Task(
                description = request.description,
                startTime = request.startTime,
                endTime = request.endTime,
                owner = owner,
                projects = projects,
                tags = tags,
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
        val tags = resolveTags(request.tagIds, owner)
        task.description = request.description
        task.startTime = request.startTime
        task.endTime = request.endTime
        task.projects = projects
        task.tags = tags
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

    private fun requireTag(
        id: UUID,
        owner: User,
    ): Tag =
        tagRepository.findByIdAndOwner(id, owner)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Tag $id not found")

    private fun resolveProjects(
        projectIds: List<UUID>,
        requester: User,
    ): MutableSet<Project> {
        if (projectIds.isEmpty()) return mutableSetOf()
        return projectIds
            .map { pid ->
                val owned = projectRepository.findByIdAndOwner(pid, requester)
                if (owned != null) return@map owned
                val project =
                    projectRepository.findById(pid).orElse(null)
                        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project $pid not found")
                if (!memberRepository.existsByProjectAndUser(project, requester)) {
                    throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project $pid not found")
                }
                project
            }.toMutableSet()
    }

    private fun resolveTags(
        tagIds: List<UUID>,
        owner: User,
    ): MutableSet<Tag> {
        if (tagIds.isEmpty()) return mutableSetOf()
        return tagIds.map { requireTag(it, owner) }.toMutableSet()
    }
}

fun Task.toResponse(): TaskResponse =
    TaskResponse(
        id = id,
        description = description,
        startTime = startTime,
        endTime = endTime,
        projectIds = projects.map { it.id },
        tags = tags.map { TagResponse(it.id, it.name, it.color) },
        ownerUsername = owner.username,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )
