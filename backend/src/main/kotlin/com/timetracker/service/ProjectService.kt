package com.timetracker.service

import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.InviteMemberRequest
import com.timetracker.dto.MemberResponse
import com.timetracker.dto.ProjectResponse
import com.timetracker.dto.TaskResponse
import com.timetracker.dto.UpdateProjectRequest
import com.timetracker.dto.UserTimeBreakdown
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
import java.time.YearMonth
import java.time.ZoneOffset
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
        val memberRootProjects = memberRepository.findAllByUser(user).map { it.project }
        val memberSubtrees = memberRootProjects.flatMap { collectSubtree(it) }
        return (owned + memberSubtrees).distinctBy { it.id }.map { it.toResponse() }
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
        val (totalSeconds, userBreakdown) = computeAggregation(project, from, to)
        return project.toResponse(totalSeconds, userBreakdown)
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
        filterUserId: UUID? = null,
    ): List<TaskResponse> {
        val user = requireUser(username)
        val project = requireProjectAccess(id, user)
        val subtree = collectSubtree(project)
        val tasks =
            if (from != null && to != null) {
                taskRepository.findAllByProjectsInAndTimeRange(subtree, from, to)
            } else {
                taskRepository.findAllByProjectsIn(subtree)
            }
        return tasks
            .let { list -> if (filterUserId != null) list.filter { it.owner.id == filterUserId } else list }
            .map { it.toResponse() }
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

    fun exportTasks(
        username: String,
        id: UUID,
        month: String?,
    ): String {
        val user = requireUser(username)
        val project = requireProjectAccess(id, user)
        val subtree = collectSubtree(project)

        val tasks =
            if (month != null) {
                val ym =
                    runCatching { YearMonth.parse(month) }.getOrElse {
                        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid month format; use YYYY-MM")
                    }
                val from = ym.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant()
                val to =
                    ym
                        .plusMonths(1)
                        .atDay(1)
                        .atStartOfDay(ZoneOffset.UTC)
                        .toInstant()
                taskRepository.findAllByProjectsInAndTimeRange(subtree, from, to)
            } else {
                taskRepository.findAllByProjectsIn(subtree)
            }

        val sb = StringBuilder()
        sb.append("username,project_path,description,start_time,end_time,duration_seconds\n")
        val now = Instant.now()
        for (task in tasks) {
            val projPath = task.projects.firstOrNull { it in subtree }?.let { buildProjectPath(it) } ?: ""
            val endTime = task.endTime
            val durationSeconds = ((endTime ?: now).epochSecond - task.startTime.epochSecond).coerceAtLeast(0)
            sb.append(
                listOf(
                    csvEscape(task.owner.username),
                    csvEscape(projPath),
                    csvEscape(task.description ?: ""),
                    task.startTime.toString(),
                    endTime?.toString() ?: "",
                    durationSeconds.toString(),
                ).joinToString(","),
            )
            sb.append("\n")
        }
        return sb.toString()
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
     * Returns the project when the caller is the owner OR a member of the project or any ancestor.
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
        if (isMemberOfProjectOrAncestor(project, user)) return project
        throw ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found")
    }

    private fun isMemberOfProjectOrAncestor(
        project: Project,
        user: User,
    ): Boolean {
        var current: Project? = project
        while (current != null) {
            if (memberRepository.existsByProjectAndUser(current, user)) return true
            current = current.parent
        }
        return false
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

    private fun buildProjectPath(project: Project): String {
        val parts = mutableListOf<String>()
        var current: Project? = project
        while (current != null) {
            parts.add(0, current.name)
            current = current.parent
        }
        return parts.joinToString("/")
    }

    private fun csvEscape(value: String): String {
        if (value.contains(',') || value.contains('"') || value.contains('\n')) {
            return "\"${value.replace("\"", "\"\"")}\""
        }
        return value
    }

    private fun computeAggregation(
        project: Project,
        from: Instant?,
        to: Instant?,
    ): Pair<Long, List<UserTimeBreakdown>> {
        val subtree = collectSubtree(project)
        val tasks =
            if (from != null && to != null) {
                taskRepository.findAllByProjectsInAndTimeRange(subtree, from, to)
            } else {
                taskRepository.findAllByProjectsIn(subtree)
            }
        val now = Instant.now()
        val byUser = tasks.groupBy { it.owner }
        val breakdown =
            byUser.entries.map { (taskOwner, userTasks) ->
                val secs =
                    userTasks.sumOf { task ->
                        val end = task.endTime ?: now
                        (end.epochSecond - task.startTime.epochSecond).coerceAtLeast(0)
                    }
                UserTimeBreakdown(userId = taskOwner.id, username = taskOwner.username, seconds = secs)
            }
        return Pair(breakdown.sumOf { it.seconds }, breakdown)
    }
}

fun Project.toResponse(
    totalSeconds: Long = 0,
    userBreakdown: List<UserTimeBreakdown> = emptyList(),
): ProjectResponse =
    ProjectResponse(
        id = id,
        name = name,
        description = description,
        color = color,
        parentId = parent?.id,
        ownerUsername = owner.username,
        createdAt = createdAt,
        totalSeconds = totalSeconds,
        userBreakdown = userBreakdown,
    )

fun ProjectMember.toMemberResponse(): MemberResponse =
    MemberResponse(
        userId = user.id,
        username = user.username,
        role = role,
    )
