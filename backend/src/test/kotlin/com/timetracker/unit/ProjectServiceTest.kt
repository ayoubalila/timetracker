package com.timetracker.unit

import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.InviteMemberRequest
import com.timetracker.dto.UpdateProjectRequest
import com.timetracker.model.Project
import com.timetracker.model.ProjectMember
import com.timetracker.model.Task
import com.timetracker.model.User
import com.timetracker.repository.ProjectMemberRepository
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.TaskRepository
import com.timetracker.repository.UserRepository
import com.timetracker.service.ProjectService
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
import kotlin.test.assertTrue

class ProjectServiceTest {
    private val projectRepository: ProjectRepository = mock()
    private val taskRepository: TaskRepository = mock()
    private val userRepository: UserRepository = mock()
    private val memberRepository: ProjectMemberRepository = mock()
    private val service = ProjectService(projectRepository, taskRepository, userRepository, memberRepository)

    private val alice = User(username = "alice", email = "alice@test.com", password = "hashed")
    private val bob = User(username = "bob", email = "bob@test.com", password = "hashed")

    private fun stubAlice() = whenever(userRepository.findByUsername("alice")).thenReturn(alice)

    private fun stubBob() = whenever(userRepository.findByUsername("bob")).thenReturn(bob)

    @BeforeEach
    fun setUp() {
        // Safe defaults: projects not found, no memberships
        whenever(projectRepository.findById(any<UUID>())).thenReturn(Optional.empty())
        whenever(memberRepository.findAllByUser(any<User>())).thenReturn(emptyList())
        whenever(memberRepository.existsByProjectAndUser(any<Project>(), any<User>())).thenReturn(false)
    }

    // ── requireUser ────────────────────────────────────────────────────────────

    @Test
    fun `getAll throws 404 when user not found`() {
        whenever(userRepository.findByUsername("ghost")).thenReturn(null)
        val ex =
            assertThrows<ResponseStatusException> {
                service.getAll("ghost")
            }
        assertEquals(404, ex.statusCode.value())
    }

    // ── getAll ─────────────────────────────────────────────────────────────────

    @Test
    fun `getAll returns all projects for user`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findAllByOwner(alice)).thenReturn(listOf(p))

        val result = service.getAll("alice")

        assertEquals(1, result.size)
        assertEquals("Work", result[0].name)
    }

    @Test
    fun `getAll returns owned and member projects combined`() {
        stubBob()
        val aliceProject = Project(name = "Shared Work", owner = alice)
        whenever(projectRepository.findAllByOwner(bob)).thenReturn(emptyList())
        val membership = ProjectMember(project = aliceProject, user = bob)
        whenever(memberRepository.findAllByUser(bob)).thenReturn(listOf(membership))

        val result = service.getAll("bob")

        assertEquals(1, result.size)
        assertEquals("Shared Work", result[0].name)
        assertEquals("alice", result[0].ownerUsername)
    }

    @Test
    fun `getAll deduplicates projects that appear in both owned and member lists`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findAllByOwner(alice)).thenReturn(listOf(p))
        // Shouldn't happen in practice but must be safe
        whenever(memberRepository.findAllByUser(alice)).thenReturn(
            listOf(ProjectMember(project = p, user = alice)),
        )

        val result = service.getAll("alice")

        assertEquals(1, result.size)
    }

    // ── create ─────────────────────────────────────────────────────────────────

    @Test
    fun `create top-level project succeeds`() {
        stubAlice()
        whenever(projectRepository.existsByOwnerAndNameAndParentIsNull(alice, "Work")).thenReturn(false)
        val saved = Project(name = "Work", owner = alice)
        whenever(projectRepository.save(any<Project>())).thenReturn(saved)

        val result = service.create("alice", CreateProjectRequest(name = "Work"))

        assertEquals("Work", result.name)
        assertEquals(null, result.parentId)
        assertEquals("alice", result.ownerUsername)
        verify(projectRepository).save(any<Project>())
    }

    @Test
    fun `create subproject succeeds`() {
        stubAlice()
        val parent = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(parent.id, alice)).thenReturn(parent)
        whenever(projectRepository.existsByOwnerAndNameAndParent(alice, "Sub", parent)).thenReturn(false)
        val saved = Project(name = "Sub", parent = parent, owner = alice)
        whenever(projectRepository.save(any<Project>())).thenReturn(saved)

        val result = service.create("alice", CreateProjectRequest(name = "Sub", parentId = parent.id))

        assertEquals("Sub", result.name)
        assertEquals(parent.id, result.parentId)
    }

    @Test
    fun `create - duplicate top-level name throws 409`() {
        stubAlice()
        whenever(projectRepository.existsByOwnerAndNameAndParentIsNull(alice, "Work")).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.create("alice", CreateProjectRequest(name = "Work"))
            }
        assertEquals(409, ex.statusCode.value())
    }

    @Test
    fun `create - parent not owned by user throws 404`() {
        stubAlice()
        val otherId = UUID.randomUUID()
        // findByIdAndOwner returns null (not mocked = default null); findById returns empty (from setUp)

        val ex =
            assertThrows<ResponseStatusException> {
                service.create("alice", CreateProjectRequest(name = "Sub", parentId = otherId))
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `create - member cannot create subproject under shared project (403)`() {
        stubBob()
        val p = Project(name = "Work", owner = alice)
        // Bob is not the owner: findByIdAndOwner(p.id, bob) returns null
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.create("bob", CreateProjectRequest(name = "Sub", parentId = p.id))
            }
        assertEquals(403, ex.statusCode.value())
    }

    @Test
    fun `create - exceeds max depth throws 400`() {
        stubAlice()
        // Build a chain: p1 → p2 → p3 → p4 → p5 (depth = 5)
        val p1 = Project(name = "L1", owner = alice)
        val p2 = Project(name = "L2", owner = alice, parent = p1)
        val p3 = Project(name = "L3", owner = alice, parent = p2)
        val p4 = Project(name = "L4", owner = alice, parent = p3)
        val p5 = Project(name = "L5", owner = alice, parent = p4)
        whenever(projectRepository.findByIdAndOwner(p5.id, alice)).thenReturn(p5)

        val ex =
            assertThrows<ResponseStatusException> {
                service.create("alice", CreateProjectRequest(name = "L6", parentId = p5.id))
            }
        assertEquals(400, ex.statusCode.value())
    }

    // ── getById ────────────────────────────────────────────────────────────────

    @Test
    fun `getById returns project with totalSeconds`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(emptyList())

        val result = service.getById("alice", p.id)

        assertEquals("Work", result.name)
        assertEquals(0L, result.totalSeconds)
    }

    @Test
    fun `getById - not found throws 404`() {
        stubAlice()
        val id = UUID.randomUUID()
        // findByIdAndOwner returns null (default); findById returns empty (from setUp)

        val ex =
            assertThrows<ResponseStatusException> {
                service.getById("alice", id)
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `getById - member can access shared project`() {
        stubBob()
        val p = Project(name = "Shared Work", owner = alice)
        // Bob is not owner: findByIdAndOwner(p.id, bob) returns null
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(emptyList())

        val result = service.getById("bob", p.id)

        assertEquals("Shared Work", result.name)
        assertEquals("alice", result.ownerUsername)
    }

    @Test
    fun `getById - non-member gets 404`() {
        stubBob()
        val p = Project(name = "Private", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        // existsByProjectAndUser returns false (from setUp)

        val ex =
            assertThrows<ResponseStatusException> {
                service.getById("bob", p.id)
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `getById with date range delegates to range query`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        val now = Instant.now()
        val from = now.minusSeconds(3600)
        val to = now
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsInAndTimeRange(setOf(p), from, to))
            .thenReturn(emptyList())

        val result = service.getById("alice", p.id, from, to)

        verify(taskRepository).findAllByProjectsInAndTimeRange(setOf(p), from, to)
        assertEquals(0L, result.totalSeconds)
    }

    @Test
    fun `getById counts running task duration up to now`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        val startTime = Instant.now().minusSeconds(60)
        val runningTask = Task(startTime = startTime, endTime = null, owner = alice, projects = mutableSetOf(p))
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(listOf(runningTask))

        val result = service.getById("alice", p.id)

        assertTrue(result.totalSeconds >= 59L)
    }

    // ── update ─────────────────────────────────────────────────────────────────

    @Test
    fun `update renames project`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.existsByOwnerAndNameAndParentIsNull(alice, "Renamed")).thenReturn(false)
        whenever(projectRepository.save(any<Project>())).thenReturn(p)

        val result = service.update("alice", p.id, UpdateProjectRequest(name = "Renamed"))

        assertEquals("Renamed", result.name)
    }

    @Test
    fun `update - duplicate name throws 409`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.existsByOwnerAndNameAndParentIsNull(alice, "Other")).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.update("alice", p.id, UpdateProjectRequest(name = "Other"))
            }
        assertEquals(409, ex.statusCode.value())
    }

    @Test
    fun `update - same name does not check uniqueness`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.save(any<Project>())).thenReturn(p)

        val result = service.update("alice", p.id, UpdateProjectRequest(name = "Work", description = "Updated"))

        assertEquals("Work", result.name)
    }

    @Test
    fun `update persists description and color changes`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.save(any<Project>())).thenAnswer { it.arguments[0] as Project }

        val result =
            service.update(
                "alice",
                p.id,
                UpdateProjectRequest(name = "Work", description = "My desc", color = "#aabbcc"),
            )

        assertEquals("Work", result.name)
        assertEquals("My desc", result.description)
        assertEquals("#aabbcc", result.color)
    }

    @Test
    fun `update - member gets 403`() {
        stubBob()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.update("bob", p.id, UpdateProjectRequest(name = "Renamed"))
            }
        assertEquals(403, ex.statusCode.value())
    }

    @Test
    fun `update - non-member gets 404`() {
        stubBob()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        // existsByProjectAndUser returns false (from setUp)

        val ex =
            assertThrows<ResponseStatusException> {
                service.update("bob", p.id, UpdateProjectRequest(name = "Renamed"))
            }
        assertEquals(404, ex.statusCode.value())
    }

    // ── delete ─────────────────────────────────────────────────────────────────

    @Test
    fun `delete removes project`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)

        service.delete("alice", p.id)

        verify(projectRepository).delete(p)
    }

    @Test
    fun `delete - not found throws 404`() {
        stubAlice()
        val id = UUID.randomUUID()
        // findByIdAndOwner returns null; findById returns empty (setUp)

        val ex =
            assertThrows<ResponseStatusException> {
                service.delete("alice", id)
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `delete - member gets 403`() {
        stubBob()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.delete("bob", p.id)
            }
        assertEquals(403, ex.statusCode.value())
    }

    // ── totalSeconds / time aggregation ────────────────────────────────────────

    @Test
    fun `getById computes totalSeconds from tasks`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        val now = Instant.now()
        val task =
            Task(
                startTime = now.minusSeconds(3600),
                endTime = now,
                owner = alice,
                projects = mutableSetOf(p),
            )
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(listOf(task))

        val result = service.getById("alice", p.id)

        assertTrue(result.totalSeconds >= 3599L)
    }

    @Test
    fun `getById includes subproject tasks in totalSeconds`() {
        stubAlice()
        val parent = Project(name = "Work", owner = alice)
        val child = Project(name = "Sub", owner = alice, parent = parent)
        val now = Instant.now()
        val task =
            Task(
                startTime = now.minusSeconds(1800),
                endTime = now,
                owner = alice,
                projects = mutableSetOf(child),
            )
        whenever(projectRepository.findByIdAndOwner(parent.id, alice)).thenReturn(parent)
        whenever(projectRepository.findByParent(parent)).thenReturn(listOf(child))
        whenever(projectRepository.findByParent(child)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(parent, child)))
            .thenReturn(listOf(task))

        val result = service.getById("alice", parent.id)

        assertTrue(result.totalSeconds >= 1799L)
    }

    // ── getProjectTasks ────────────────────────────────────────────────────────

    @Test
    fun `getProjectTasks with date range delegates to range query`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        val now = Instant.now()
        val from = now.minusSeconds(3600)
        val to = now
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsInAndTimeRange(setOf(p), from, to))
            .thenReturn(emptyList())

        val result = service.getProjectTasks("alice", p.id, from, to)

        verify(taskRepository).findAllByProjectsInAndTimeRange(setOf(p), from, to)
        assertEquals(0, result.size)
    }

    @Test
    fun `getProjectTasks returns tasks for project and subprojects`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        val now = Instant.now()
        val task = Task(startTime = now.minusSeconds(60), endTime = now, owner = alice, projects = mutableSetOf(p))
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(listOf(task))

        val result = service.getProjectTasks("alice", p.id)

        assertEquals(1, result.size)
        assertEquals(task.id, result[0].id)
    }

    @Test
    fun `getProjectTasks - not found throws 404`() {
        stubAlice()
        val id = UUID.randomUUID()
        // findByIdAndOwner returns null; findById returns empty (setUp)

        val ex =
            assertThrows<ResponseStatusException> {
                service.getProjectTasks("alice", id)
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `getProjectTasks - member can access shared project tasks`() {
        stubBob()
        val p = Project(name = "Shared Work", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(emptyList())

        val result = service.getProjectTasks("bob", p.id)

        assertEquals(0, result.size)
    }

    // ── getMembers ─────────────────────────────────────────────────────────────

    @Test
    fun `getMembers returns list of members`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        val membership = ProjectMember(project = p, user = bob)
        whenever(memberRepository.findAllByProject(p)).thenReturn(listOf(membership))

        val result = service.getMembers("alice", p.id)

        assertEquals(1, result.size)
        assertEquals("bob", result[0].username)
        assertEquals("MEMBER", result[0].role)
    }

    @Test
    fun `getMembers - member can see other members`() {
        stubBob()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)
        whenever(memberRepository.findAllByProject(p)).thenReturn(emptyList())

        val result = service.getMembers("bob", p.id)

        assertEquals(0, result.size)
    }

    // ── inviteMember ───────────────────────────────────────────────────────────

    @Test
    fun `inviteMember adds membership`() {
        stubAlice()
        whenever(userRepository.findByUsername("bob")).thenReturn(bob)
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        val saved = ProjectMember(project = p, user = bob)
        whenever(memberRepository.save(any<ProjectMember>())).thenReturn(saved)

        val result = service.inviteMember("alice", p.id, InviteMemberRequest(username = "bob"))

        assertEquals("bob", result.username)
        assertEquals("MEMBER", result.role)
        verify(memberRepository).save(any<ProjectMember>())
    }

    @Test
    fun `inviteMember - throws 404 when user not found`() {
        stubAlice()
        whenever(userRepository.findByUsername("ghost")).thenReturn(null)
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)

        val ex =
            assertThrows<ResponseStatusException> {
                service.inviteMember("alice", p.id, InviteMemberRequest(username = "ghost"))
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `inviteMember - throws 409 when already member`() {
        stubAlice()
        whenever(userRepository.findByUsername("bob")).thenReturn(bob)
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.inviteMember("alice", p.id, InviteMemberRequest(username = "bob"))
            }
        assertEquals(409, ex.statusCode.value())
    }

    @Test
    fun `inviteMember - throws 400 when inviting self`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)

        val ex =
            assertThrows<ResponseStatusException> {
                service.inviteMember("alice", p.id, InviteMemberRequest(username = "alice"))
            }
        assertEquals(400, ex.statusCode.value())
    }

    @Test
    fun `inviteMember - member cannot invite (403)`() {
        stubBob()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.inviteMember("bob", p.id, InviteMemberRequest(username = "alice"))
            }
        assertEquals(403, ex.statusCode.value())
    }

    @Test
    fun `inviteMember - non-member gets 404`() {
        stubBob()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        // existsByProjectAndUser returns false (setUp)

        val ex =
            assertThrows<ResponseStatusException> {
                service.inviteMember("bob", p.id, InviteMemberRequest(username = "alice"))
            }
        assertEquals(404, ex.statusCode.value())
    }

    // ── removeMember ───────────────────────────────────────────────────────────

    @Test
    fun `removeMember removes membership`() {
        stubAlice()
        whenever(userRepository.findById(bob.id)).thenReturn(Optional.of(bob))
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        val membership = ProjectMember(project = p, user = bob)
        whenever(memberRepository.findByProjectAndUser(p, bob)).thenReturn(membership)

        service.removeMember("alice", p.id, bob.id)

        verify(memberRepository).delete(membership)
    }

    @Test
    fun `removeMember - throws 404 when user is not a member`() {
        stubAlice()
        whenever(userRepository.findById(bob.id)).thenReturn(Optional.of(bob))
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(memberRepository.findByProjectAndUser(p, bob)).thenReturn(null)

        val ex =
            assertThrows<ResponseStatusException> {
                service.removeMember("alice", p.id, bob.id)
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `removeMember - member cannot remove (403)`() {
        stubBob()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findById(p.id)).thenReturn(Optional.of(p))
        whenever(memberRepository.existsByProjectAndUser(p, bob)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.removeMember("bob", p.id, alice.id)
            }
        assertEquals(403, ex.statusCode.value())
    }

    // ── M7B fix: subproject visibility ────────────────────────────────────────

    @Test
    fun `getAll includes subprojects of shared projects`() {
        stubBob()
        val parent = Project(name = "Work", owner = alice)
        val child = Project(name = "Backend", owner = alice, parent = parent)
        whenever(projectRepository.findAllByOwner(bob)).thenReturn(emptyList())
        whenever(memberRepository.findAllByUser(bob)).thenReturn(
            listOf(ProjectMember(project = parent, user = bob)),
        )
        whenever(projectRepository.findByParent(parent)).thenReturn(listOf(child))
        whenever(projectRepository.findByParent(child)).thenReturn(emptyList())

        val result = service.getAll("bob")

        assertEquals(2, result.size)
        assertTrue(result.any { it.name == "Work" })
        assertTrue(result.any { it.name == "Backend" })
    }

    @Test
    fun `getById succeeds for member accessing subproject of shared root`() {
        stubBob()
        val parent = Project(name = "Work", owner = alice)
        val sub = Project(name = "Backend", owner = alice, parent = parent)
        whenever(projectRepository.findById(sub.id)).thenReturn(Optional.of(sub))
        whenever(memberRepository.existsByProjectAndUser(sub, bob)).thenReturn(false)
        whenever(memberRepository.existsByProjectAndUser(parent, bob)).thenReturn(true)
        whenever(projectRepository.findByParent(sub)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(sub))).thenReturn(emptyList())

        val result = service.getById("bob", sub.id)

        assertEquals("Backend", result.name)
    }

    @Test
    fun `getById throws 404 when bob is not member of any ancestor`() {
        stubBob()
        val parent = Project(name = "Work", owner = alice)
        val sub = Project(name = "Backend", owner = alice, parent = parent)
        whenever(projectRepository.findById(sub.id)).thenReturn(Optional.of(sub))
        // existsByProjectAndUser returns false for both sub and parent (setUp default)

        val ex =
            assertThrows<ResponseStatusException> {
                service.getById("bob", sub.id)
            }
        assertEquals(404, ex.statusCode.value())
    }

    @Test
    fun `getProjectTasks succeeds for member accessing subproject of shared root`() {
        stubBob()
        val parent = Project(name = "Work", owner = alice)
        val sub = Project(name = "Backend", owner = alice, parent = parent)
        whenever(projectRepository.findById(sub.id)).thenReturn(Optional.of(sub))
        whenever(memberRepository.existsByProjectAndUser(sub, bob)).thenReturn(false)
        whenever(memberRepository.existsByProjectAndUser(parent, bob)).thenReturn(true)
        whenever(projectRepository.findByParent(sub)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(sub))).thenReturn(emptyList())

        val result = service.getProjectTasks("bob", sub.id)

        assertEquals(0, result.size)
    }

    // ── M7B: shared task overview ──────────────────────────────────────────────

    @Test
    fun `getProjectTasks returns tasks from all members`() {
        stubAlice()
        val p = Project(name = "Shared", owner = alice)
        val now = Instant.now()
        val aliceTask = Task(startTime = now.minusSeconds(3600), endTime = now, owner = alice, projects = mutableSetOf(p))
        val bobTask = Task(startTime = now.minusSeconds(1800), endTime = now, owner = bob, projects = mutableSetOf(p))
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(listOf(aliceTask, bobTask))

        val result = service.getProjectTasks("alice", p.id)

        assertEquals(2, result.size)
        assertEquals(setOf(aliceTask.id, bobTask.id), result.map { it.id }.toSet())
    }

    @Test
    fun `getProjectTasks filters by userId`() {
        stubAlice()
        val p = Project(name = "Shared", owner = alice)
        val now = Instant.now()
        val aliceTask = Task(startTime = now.minusSeconds(3600), endTime = now, owner = alice, projects = mutableSetOf(p))
        val bobTask = Task(startTime = now.minusSeconds(1800), endTime = now, owner = bob, projects = mutableSetOf(p))
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(listOf(aliceTask, bobTask))

        val result = service.getProjectTasks("alice", p.id, filterUserId = bob.id)

        assertEquals(1, result.size)
        assertEquals(bobTask.id, result[0].id)
    }

    @Test
    fun `getById computes combined totalSeconds from all members`() {
        stubAlice()
        val p = Project(name = "Shared", owner = alice)
        val now = Instant.now()
        val aliceTask = Task(startTime = now.minusSeconds(3600), endTime = now, owner = alice, projects = mutableSetOf(p))
        val bobTask = Task(startTime = now.minusSeconds(1800), endTime = now, owner = bob, projects = mutableSetOf(p))
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(listOf(aliceTask, bobTask))

        val result = service.getById("alice", p.id)

        assertTrue(result.totalSeconds >= 5399L)
        assertEquals(2, result.userBreakdown.size)
    }

    @Test
    fun `getById userBreakdown lists per-user seconds`() {
        stubAlice()
        val p = Project(name = "Shared", owner = alice)
        val now = Instant.now()
        val aliceTask =
            Task(
                startTime = now.minusSeconds(3600),
                endTime = now,
                owner = alice,
                projects = mutableSetOf(p),
            )
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)
        whenever(projectRepository.findByParent(p)).thenReturn(emptyList())
        whenever(taskRepository.findAllByProjectsIn(setOf(p))).thenReturn(listOf(aliceTask))

        val result = service.getById("alice", p.id)

        assertEquals(1, result.userBreakdown.size)
        assertEquals("alice", result.userBreakdown[0].username)
        assertTrue(result.userBreakdown[0].seconds >= 3599L)
    }
}
