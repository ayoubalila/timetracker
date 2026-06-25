package com.timetracker.service

import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.ProjectResponse
import com.timetracker.dto.UpdateProjectRequest
import com.timetracker.model.Project
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

private const val MAX_DEPTH = 5

@Service
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val userRepository: UserRepository,
) {
    fun getAll(username: String): List<ProjectResponse> {
        val owner = requireUser(username)
        return projectRepository.findAllByOwner(owner).map { it.toResponse() }
    }

    fun create(
        username: String,
        request: CreateProjectRequest,
    ): ProjectResponse {
        val owner = requireUser(username)
        val parent = resolveParent(request.parentId, owner.username)
        checkDepth(parent)
        checkNameUnique(owner.username, request.name, parent)
        val project =
            Project(
                name = request.name,
                description = request.description,
                color = request.color,
                parent = parent,
                owner = owner,
            )
        return projectRepository.save(project).toResponse()
    }

    fun getById(
        username: String,
        id: UUID,
    ): ProjectResponse {
        val owner = requireUser(username)
        return requireProject(id, owner.username).toResponse()
    }

    fun update(
        username: String,
        id: UUID,
        request: UpdateProjectRequest,
    ): ProjectResponse {
        val owner = requireUser(username)
        val project = requireProject(id, owner.username)
        if (project.name != request.name) {
            checkNameUnique(owner.username, request.name, project.parent)
        }
        project.name = request.name
        project.description = request.description
        project.color = request.color
        return projectRepository.save(project).toResponse()
    }

    fun delete(
        username: String,
        id: UUID,
    ) {
        val owner = requireUser(username)
        val project = requireProject(id, owner.username)
        projectRepository.delete(project)
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private fun requireUser(username: String) =
        userRepository.findByUsername(username)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found")

    private fun requireProject(
        id: UUID,
        username: String,
    ): Project {
        val owner = requireUser(username)
        return projectRepository.findByIdAndOwner(id, owner)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
    }

    private fun resolveParent(
        parentId: UUID?,
        username: String,
    ): Project? {
        if (parentId == null) return null
        val owner = requireUser(username)
        return projectRepository.findByIdAndOwner(parentId, owner)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Parent project not found")
    }

    private fun checkDepth(parent: Project?) {
        if (parent == null) return
        var depth = 1
        var current: Project? = parent
        while (current?.parent != null) {
            depth++
            current = current.parent
            if (depth >= MAX_DEPTH) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum project depth of $MAX_DEPTH exceeded")
            }
        }
    }

    private fun checkNameUnique(
        username: String,
        name: String,
        parent: Project?,
    ) {
        val owner = requireUser(username)
        val exists =
            if (parent == null) {
                projectRepository.existsByOwnerAndNameAndParentIsNull(owner, name)
            } else {
                projectRepository.existsByOwnerAndNameAndParent(owner, name, parent)
            }
        if (exists) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "A project named '$name' already exists at this level")
        }
    }
}

fun Project.toResponse(): ProjectResponse =
    ProjectResponse(
        id = id,
        name = name,
        description = description,
        color = color,
        parentId = parent?.id,
        createdAt = createdAt,
    )
