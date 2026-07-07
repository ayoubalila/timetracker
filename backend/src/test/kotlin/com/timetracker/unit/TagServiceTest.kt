package com.timetracker.unit

import com.timetracker.dto.CreateTagRequest
import com.timetracker.model.Tag
import com.timetracker.model.User
import com.timetracker.repository.TagRepository
import com.timetracker.repository.UserRepository
import com.timetracker.service.TagService
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.web.server.ResponseStatusException
import java.util.UUID
import kotlin.test.assertEquals

class TagServiceTest {
    private val tagRepository: TagRepository = mock()
    private val userRepository: UserRepository = mock()
    private val service = TagService(tagRepository, userRepository)

    private val alice = User(username = "alice", email = "alice@test.com", password = "hashed")

    private fun stubAlice() = whenever(userRepository.findByUsername("alice")).thenReturn(alice)

    private fun tag(name: String = "deep-work", color: String = "#4A90D9") =
        Tag(name = name, color = color, owner = alice)

    // ── listAll ────────────────────────────────────────────────────────────────

    @Test
    fun `listAll returns user tags ordered by name`() {
        stubAlice()
        val t1 = tag("alpha")
        val t2 = tag("beta")
        whenever(tagRepository.findAllByOwnerOrderByName(alice)).thenReturn(listOf(t1, t2))

        val result = service.listAll("alice")

        assertEquals(2, result.size)
        assertEquals("alpha", result[0].name)
        assertEquals("beta", result[1].name)
    }

    @Test
    fun `listAll throws 404 when user not found`() {
        whenever(userRepository.findByUsername("ghost")).thenReturn(null)

        val ex = assertThrows<ResponseStatusException> { service.listAll("ghost") }
        assertEquals(404, ex.statusCode.value())
    }

    // ── create ─────────────────────────────────────────────────────────────────

    @Test
    fun `create saves tag and returns response`() {
        stubAlice()
        whenever(tagRepository.existsByNameAndOwner("deep-work", alice)).thenReturn(false)
        val saved = tag()
        whenever(tagRepository.save(any<Tag>())).thenReturn(saved)

        val result = service.create("alice", CreateTagRequest(name = "deep-work", color = "#4A90D9"))

        verify(tagRepository).save(any<Tag>())
        assertEquals("deep-work", result.name)
        assertEquals("#4A90D9", result.color)
    }

    @Test
    fun `create throws 409 for duplicate name`() {
        stubAlice()
        whenever(tagRepository.existsByNameAndOwner("deep-work", alice)).thenReturn(true)

        val ex =
            assertThrows<ResponseStatusException> {
                service.create("alice", CreateTagRequest(name = "deep-work", color = "#4A90D9"))
            }
        assertEquals(409, ex.statusCode.value())
    }

    // ── delete ─────────────────────────────────────────────────────────────────

    @Test
    fun `delete removes tag`() {
        stubAlice()
        val t = tag()
        whenever(tagRepository.findByIdAndOwner(t.id, alice)).thenReturn(t)

        service.delete("alice", t.id)

        verify(tagRepository).delete(t)
    }

    @Test
    fun `delete throws 404 when tag not owned`() {
        stubAlice()
        val id = UUID.randomUUID()
        whenever(tagRepository.findByIdAndOwner(id, alice)).thenReturn(null)

        val ex = assertThrows<ResponseStatusException> { service.delete("alice", id) }
        assertEquals(404, ex.statusCode.value())
    }
}
