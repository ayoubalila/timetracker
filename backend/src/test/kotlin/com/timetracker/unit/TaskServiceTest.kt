package com.timetracker.unit

import com.timetracker.dto.CreateTaskRequest
import com.timetracker.dto.StartTaskRequest
import com.timetracker.dto.UpdateTaskRequest
import com.timetracker.model.Project
import com.timetracker.model.Task
import com.timetracker.model.User
import com.timetracker.repository.ProjectMemberRepository
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.TagRepository
import com.timetracker.repository.TaskRepository
import com.timetracker.repository.UserRepository
import com.timetracker.service.TaskService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.Optional
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class TaskServiceTest {
    private val taskRepository: TaskRepository = mock()
    private val projectRepository: ProjectRepository = mock()
    private val userRepository: UserRepository = mock()
    private val memberRepository: ProjectMemberRepository = mock()
    private val tagRepository: TagRepository = mock()
    private val service = TaskService(taskRepository, projectRepository, userRepository, memberRepository, tagRepository)

    private val alice = User(username = "alice", email = "alice@test.com", password = "hashed")
    private val now = Instant.now()

    private fun stubAlice() = whenever(userRepository.findByUsername("alice")).thenReturn(alice)

    @BeforeEach
    fun setUp() {
        // When findById is reached (no owned project found), default to not found
        whenever(projectRepository.findById(any<UUID>())).thenReturn(Optional.empty())
        whenever(memberRepository.existsByProjectAndUser(any<Project>(), any<User>())).thenReturn(false)
    }

    private fun task(endTime: Instant? = null) = Task(startTime = now.minusSeconds(60), endTime = endTime, owner = alice)

    // ── requireUser ────────────────────────────────────────────────────────────

    @Test
    fun `listAll throws 404 when user not found`() {
        whenever(userRepository.findByUsername("ghost")).thenReturn(null)
        val ex =
            assertThrows<ResponseStatusException> {
                service.listAll("ghost", null, null)
            }
        assertEquals(404, ex.statusCode.value())
    }

    // ── listAll ────────────────────────────────────────────────────────────────

    @Test
    fun `listAll returns all tasks for owner`() {
        stubAlice()
        val t = task()
        whenever(taskRepository.findAllByOwnerOrderByStartTimeDesc(alice)).thenReturn(listOf(t))

        val result = service.listAll("alice", null, null)

        assertEquals(1, result.size)
        assertEquals(t.id, result[0].id)
    }

    @Test
    fun `listAll with date range delegates to range query`() {
        stubAlice()
        val from = now.minusSeconds(3600)
        val to = now
        whenever(taskRepository.findByOwnerAndTimeRange(alice, from, to)).thenReturn(emptyList())

        val result = service.listAll("alice", from, to)

        assertEquals(0, result.size)
        verify(taskRepository).findByOwnerAndTimeRange(alice, from, to)
    }

    // ── getCurrent ─────────────────────────────────────────────────────────────

    @Test
    fun `getCurrent returns running task`() {
        stubAlice()
        val t = task()
        whenever(taskRepository.findByOwnerAndEndTimeIsNull(alice)).thenReturn(t)

        val result = service.getCurrent("alice")

        assertNotNull(result)
        assertEquals(t.id, result.id)
        assertNull(result.endTime)
    }

    @Test
    fun `getCurrent returns null when no task is running`() {
        stubAlice()
        whenever(taskRepository.findByOwnerAndEndTimeIsNull(alice)).thenReturn(null)

        val result = service.getCurrent("alice")

        assertNull(result)
    }

    // ── start ──────────────────────────────────────────────────────────────────

    @Test
    fun `start creates running task`() {
        stubAlice()
        whenever(taskRepository.existsByOwnerAndEndTimeIsNull(alice)).thenReturn(false)
        val saved = task()
        whenever(taskRepository.save(any<Task>())).thenReturn(saved)

        val result = service.start("alice", StartTaskRequest(description = "Writing code"))

        assertNull(result.endTime)
        verify(taskRepository).save(any<Task>())
    }

    @Test
    fun `start throws 409 when task already running`() {
        stubAlice()
        whenever(taskRepository.existsByOwnerAndEndTimeIsNull(alice)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.start("alice", StartTaskRequest())
            }
        assertEquals(409, ex.statusCode.value())
    }

    @Test
    fun `start associates projects by id`() {
        stubAlice()
        whenever(taskRepository.existsByOwnerAndEndTimeIsNull(alice)).thenReturn(false)
        val project = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(project.id, alice)).thenReturn(project)
        whenever(taskRepository.save(any<Task>())).thenAnswer { it.arguments[0] as Task }

        val result = service.start("alice", StartTaskRequest(projectIds = listOf(project.id)))

        assertEquals(listOf(project.id), result.projectIds)
    }

    @Test
    fun `start throws 404 for unknown project`() {
        stubAlice()
        whenever(taskRepository.existsByOwnerAndEndTimeIsNull(alice)).thenReturn(false)
        val unknownId = UUID.randomUUID()
        whenever(projectRepository.findByIdAndOwner(unknownId, alice)).thenReturn(null)
        // findById returns empty (setUp default) → 404

        val ex =
            assertThrows<ResponseStatusException> {
                service.start("alice", StartTaskRequest(projectIds = listOf(unknownId)))
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `start allows member to associate task with shared project`() {
        stubAlice()
        whenever(taskRepository.existsByOwnerAndEndTimeIsNull(alice)).thenReturn(false)
        val bob = User(username = "bob", email = "bob@test.com", password = "hashed")
        val project = Project(name = "Shared Work", owner = bob)
        // Alice is not the owner: findByIdAndOwner(project.id, alice) returns null
        whenever(projectRepository.findById(project.id)).thenReturn(Optional.of(project))
        whenever(memberRepository.existsByProjectAndUser(project, alice)).thenReturn(true)
        whenever(taskRepository.save(any<Task>())).thenAnswer { it.arguments[0] as Task }

        val result = service.start("alice", StartTaskRequest(projectIds = listOf(project.id)))

        assertEquals(listOf(project.id), result.projectIds)
    }

    @Test
    fun `start throws 404 when user is not member of project`() {
        stubAlice()
        whenever(taskRepository.existsByOwnerAndEndTimeIsNull(alice)).thenReturn(false)
        val bob = User(username = "bob", email = "bob@test.com", password = "hashed")
        val project = Project(name = "Private", owner = bob)
        whenever(projectRepository.findById(project.id)).thenReturn(Optional.of(project))
        // existsByProjectAndUser returns false (setUp default)

        val ex =
            assertThrows<ResponseStatusException> {
                service.start("alice", StartTaskRequest(projectIds = listOf(project.id)))
            }
        assertEquals(404, ex.statusCode.value())
    }

    // ── stop ───────────────────────────────────────────────────────────────────

    @Test
    fun `stop sets endTime`() {
        stubAlice()
        val t = task()
        whenever(taskRepository.findByIdAndOwner(t.id, alice)).thenReturn(t)
        whenever(taskRepository.save(any<Task>())).thenReturn(t)

        val result = service.stop("alice", t.id)

        assertNotNull(result.endTime)
    }

    @Test
    fun `stop throws 400 when task already stopped`() {
        stubAlice()
        val t = task(endTime = now)
        whenever(taskRepository.findByIdAndOwner(t.id, alice)).thenReturn(t)

        val ex =
            assertThrows<ResponseStatusException> {
                service.stop("alice", t.id)
            }
        assertEquals(400, ex.statusCode.value())
    }

    @Test
    fun `stop throws 404 when task not owned`() {
        stubAlice()
        val id = UUID.randomUUID()
        whenever(taskRepository.findByIdAndOwner(id, alice)).thenReturn(null)

        val ex =
            assertThrows<ResponseStatusException> {
                service.stop("alice", id)
            }
        assertEquals(404, ex.statusCode.value())
    }

    // ── create ─────────────────────────────────────────────────────────────────

    @Test
    fun `create manual task succeeds`() {
        stubAlice()
        val start = now.minusSeconds(3600)
        val end = now
        val saved = task(endTime = end).also { it.startTime = start }
        whenever(taskRepository.save(any<Task>())).thenReturn(saved)

        val result = service.create("alice", CreateTaskRequest(startTime = start, endTime = end))

        assertNotNull(result.endTime)
    }

    @Test
    fun `create throws 400 when endTime is not after startTime`() {
        stubAlice()
        val start = now
        val end = now.minusSeconds(1)

        val ex =
            assertThrows<ResponseStatusException> {
                service.create("alice", CreateTaskRequest(startTime = start, endTime = end))
            }
        assertEquals(400, ex.statusCode.value())
    }

    @Test
    fun `create throws 409 when creating running task while one is already active`() {
        stubAlice()
        whenever(taskRepository.existsByOwnerAndEndTimeIsNull(alice)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.create("alice", CreateTaskRequest(startTime = now.minusSeconds(60)))
            }
        assertEquals(409, ex.statusCode.value())
    }

    // ── getById ────────────────────────────────────────────────────────────────

    @Test
    fun `getById returns task`() {
        stubAlice()
        val t = task()
        whenever(taskRepository.findByIdAndOwner(t.id, alice)).thenReturn(t)

        val result = service.getById("alice", t.id)

        assertEquals(t.id, result.id)
    }

    @Test
    fun `getById throws 404 when not owned`() {
        stubAlice()
        val id = UUID.randomUUID()
        whenever(taskRepository.findByIdAndOwner(id, alice)).thenReturn(null)

        val ex =
            assertThrows<ResponseStatusException> {
                service.getById("alice", id)
            }
        assertEquals(404, ex.statusCode.value())
    }

    // ── update ─────────────────────────────────────────────────────────────────

    @Test
    fun `update modifies task fields`() {
        stubAlice()
        val t = task()
        whenever(taskRepository.findByIdAndOwner(t.id, alice)).thenReturn(t)
        whenever(taskRepository.save(any<Task>())).thenAnswer { it.arguments[0] as Task }

        val newStart = now.minusSeconds(7200)
        val newEnd = now.minusSeconds(3600)
        val result =
            service.update(
                "alice",
                t.id,
                UpdateTaskRequest(description = "Updated", startTime = newStart, endTime = newEnd),
            )

        assertEquals("Updated", result.description)
        assertEquals(newStart, result.startTime)
        assertEquals(newEnd, result.endTime)
    }

    @Test
    fun `update persists project association`() {
        stubAlice()
        val t = task()
        val project = Project(name = "Work", owner = alice)
        whenever(taskRepository.findByIdAndOwner(t.id, alice)).thenReturn(t)
        whenever(projectRepository.findByIdAndOwner(project.id, alice)).thenReturn(project)
        whenever(taskRepository.save(any<Task>())).thenAnswer { it.arguments[0] as Task }

        val newStart = now.minusSeconds(7200)
        val newEnd = now.minusSeconds(3600)
        val result =
            service.update(
                "alice",
                t.id,
                UpdateTaskRequest(startTime = newStart, endTime = newEnd, projectIds = listOf(project.id)),
            )

        assertEquals(listOf(project.id), result.projectIds)
    }

    @Test
    fun `update throws 400 when endTime is not after startTime`() {
        stubAlice()
        val t = task()
        whenever(taskRepository.findByIdAndOwner(t.id, alice)).thenReturn(t)

        val ex =
            assertThrows<ResponseStatusException> {
                service.update(
                    "alice",
                    t.id,
                    UpdateTaskRequest(startTime = now, endTime = now.minusSeconds(1)),
                )
            }
        assertEquals(400, ex.statusCode.value())
    }

    // ── delete ─────────────────────────────────────────────────────────────────

    @Test
    fun `delete removes task`() {
        stubAlice()
        val t = task()
        whenever(taskRepository.findByIdAndOwner(t.id, alice)).thenReturn(t)

        service.delete("alice", t.id)

        verify(taskRepository).delete(t)
    }

    @Test
    fun `delete throws 404 when not owned`() {
        stubAlice()
        val id = UUID.randomUUID()
        whenever(taskRepository.findByIdAndOwner(id, alice)).thenReturn(null)

        val ex =
            assertThrows<ResponseStatusException> {
                service.delete("alice", id)
            }
        assertEquals(404, ex.statusCode.value())
    }
}
