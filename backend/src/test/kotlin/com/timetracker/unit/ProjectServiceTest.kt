package com.timetracker.unit

import com.timetracker.dto.CreateProjectRequest
import com.timetracker.dto.UpdateProjectRequest
import com.timetracker.model.Project
import com.timetracker.model.User
import com.timetracker.repository.ProjectRepository
import com.timetracker.repository.UserRepository
import com.timetracker.service.ProjectService
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.web.server.ResponseStatusException
import java.util.UUID
import kotlin.test.assertEquals

class ProjectServiceTest {
    private val projectRepository: ProjectRepository = mock()
    private val userRepository: UserRepository = mock()
    private val service = ProjectService(projectRepository, userRepository)

    private val alice = User(username = "alice", email = "alice@test.com", password = "hashed")

    private fun stubAlice() = whenever(userRepository.findByUsername("alice")).thenReturn(alice)

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
        whenever(projectRepository.findByIdAndOwner(otherId, alice)).thenReturn(null)

        val ex =
            assertThrows<ResponseStatusException> {
                service.create("alice", CreateProjectRequest(name = "Sub", parentId = otherId))
            }
        assertEquals(404, ex.statusCode.value())
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
    fun `getById returns project`() {
        stubAlice()
        val p = Project(name = "Work", owner = alice)
        whenever(projectRepository.findByIdAndOwner(p.id, alice)).thenReturn(p)

        val result = service.getById("alice", p.id)

        assertEquals("Work", result.name)
    }

    @Test
    fun `getById - not found throws 404`() {
        stubAlice()
        val id = UUID.randomUUID()
        whenever(projectRepository.findByIdAndOwner(id, alice)).thenReturn(null)

        val ex =
            assertThrows<ResponseStatusException> {
                service.getById("alice", id)
            }
        assertEquals(404, ex.statusCode.value())
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
        whenever(projectRepository.findByIdAndOwner(id, alice)).thenReturn(null)

        val ex =
            assertThrows<ResponseStatusException> {
                service.delete("alice", id)
            }
        assertEquals(404, ex.statusCode.value())
    }
}
