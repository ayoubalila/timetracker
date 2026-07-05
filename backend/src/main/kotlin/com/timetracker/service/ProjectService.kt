package com.timetracker.service

import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.InviteMemberRequest
import com.timetracker.dto.MemberResponse
import com.timetracker.dto.ProjectResponse
import com.timetracker.dto.TaskResponse
import com.timetracker.dto.UpdateProjectRequest
import com.timetracker.model.Project
import com.timetracker.model.ProjectMember
import com.timetracker.model.User
import com.timetracker.repository.ProjectMemberRepository
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.TaskRepository
import com.timetracker.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

private const val MAX_DEPTH = 5

@Service
class ProjectService(
    private val projectRepository: ProjectRepository,
    private val taskRepository: TaskRepository,
    private val userRepository: UserRepository,
    private val memberRepository: ProjectMemberRepository,
) {
    fun getAll(username: String): List<ProjectResponse> {
        val user = requireUser(username)
        val owned = projectRepository.findAllByOwner(user)
        val memberProjects = memberRepository.findAllByUser(user).map { it.project }
        return (owned + memberProjects).distinctBy { it.id }.map { it.toResponse() }
    }

    fun create(
        username: String,
        request: CreateProjectRequest,
    ): ProjectResponse {
        val owner = requireUser(username)
        val parent = request.parentId?.let { requireProjectOwner(it, owner) }
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
        from: Instant? = null,
        to: Instant? = null,
    ): ProjectResponse {
        val user = requireUser(username)
        val project = requireProjectAccess(id, user)
        val totalSeconds = computeTotalSeconds(project, user, from, to)
        return project.toResponse(totalSeconds)
    }

    fun update(
        username: String,
        id: UUID,
        request: UpdateProjectRequest,
    ): ProjectResponse {
        val user = requireUser(username)
        val project = requireProjectOwner(id, user)
        if (project.name != request.name) {
            checkNameUnique(user.username, request.name, project.parent)
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
        val user = requireUser(username)
        val project = requireProjectOwner(id, user)
        projectRepository.delete(project)
    }

    fun getProjectTasks(
        username: String,
        id: UUID,
        from: Instant? = null,
        to: Instant? = null,
    ): List<TaskResponse> {
        val user = requireUser(username)
        val project = requireProjectAccess(id, user)
        val subtree = collectSubtree(project)
        return if (from != null && to != null) {
            taskRepository.findDistinctByProjectsInAndTimeRange(subtree, user, from, to)
        } else {
            taskRepository.findDistinctByProjectsIn(subtree, user)
        }.map { it.toResponse() }
    }

    fun getMembers(
        username: String,
        id: UUID,
    ): List<MemberResponse> {
        val user = requireUser(username)
        val project = requireProjectAccess(id, user)
        return memberRepository.findAllByProject(project).map { it.toMemberResponse() }
    }

    fun inviteMember(
        username: String,
        id: UUID,
        request: InviteMemberRequest,
    ): MemberResponse {
        val caller = requireUser(username)
        val project = requireProjectOwner(id, caller)
        val invitee =
            userRepository.findByUsername(request.username)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User '${request.username}' not found")
        if (invitee.id == caller.id) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot invite yourself to your own project")
        }
        if (memberRepository.existsByProjectAndUser(project, invitee)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "User is already a member of this project")
        }
        return memberRepository.save(ProjectMember(project = project, user = invitee)).toMemberResponse()
    }

    fun removeMember(
        username: String,
        id: UUID,
        memberUserId: UUID,
    ) {
        val caller = requireUser(username)
        val project = requireProjectOwner(id, caller)
        val memberUser =
            userRepository.findById(memberUserId).orElse(null)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
        val membership =
            memberRepository.findByProjectAndUser(project, memberUser)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User is not a member of this project")
        memberRepository.delete(membership)
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private fun requireUser(username: String) =
        userRepository.findByUsername(username)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")

    /**
     * Returns the project when the caller is the owner.
     * Throws 403 when the caller is a member but not the owner (project exists, caller knows it).
     * Throws 404 when the caller has no relation to the project (don't leak existence).
     */
    private fun requireProjectOwner(
        id: UUID,
        user: User,
    ): Project {
        val owned = projectRepository.findByIdAndOwner(id, user)
        if (owned != null) return owned
        val project =
            projectRepository.findById(id).orElse(null)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
        if (memberRepository.existsByProjectAndUser(project, user)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the project owner can perform this action")
        }
        throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
    }

    /**
     * Returns the project when the caller is the owner OR a member.
     * Throws 404 for anyone else (don't leak existence).
     */
    private fun requireProjectAccess(
        id: UUID,
        user: User,
    ): Project {
        val owned = projectRepository.findByIdAndOwner(id, user)
        if (owned != null) return owned
        val project =
            projectRepository.findById(id).orElse(null)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
        if (memberRepository.existsByProjectAndUser(project, user)) return project
        throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
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

    private fun collectSubtree(root: Project): Set<Project> {
        val result = mutableSetOf(root)
        val queue = ArrayDeque(listOf(root))
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            val children = projectRepository.findByParent(current)
            result.addAll(children)
            queue.addAll(children)
        }
        return result
    }

    private fun computeTotalSeconds(
        project: Project,
        owner: User,
        from: Instant?,
        to: Instant?,
    ): Long {
        val subtree = collectSubtree(project)
        val tasks =
            if (from != null && to != null) {
                taskRepository.findDistinctByProjectsInAndTimeRange(subtree, owner, from, to)
            } else {
                taskRepository.findDistinctByProjectsIn(subtree, owner)
            }
        val now = Instant.now()
        return tasks.sumOf { task ->
            val end = task.endTime ?: now
            (end.epochSecond - task.startTime.epochSecond).coerceAtLeast(0)
        }
    }
}

fun Project.toResponse(totalSeconds: Long = 0): ProjectResponse =
    ProjectResponse(
        id = id,
        name = name,
        description = description,
        color = color,
        parentId = parent?.id,
        ownerUsername = owner.username,
        createdAt = createdAt,
        totalSeconds = totalSeconds,
    )

fun ProjectMember.toMemberResponse(): MemberResponse =
    MemberResponse(
        userId = user.id,
        username = user.username,
        role = role,
    )
