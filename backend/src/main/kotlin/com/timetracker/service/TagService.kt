package com.timetracker.service

import com.timetracker.dto.CreateTagRequest
import com.timetracker.dto.TagResponse
import com.timetracker.model.Tag
import com.timetracker.model.User
import com.timetracker.repository.TagRepository
import com.timetracker.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@Service
class TagService(
    private val tagRepository: TagRepository,
    private val userRepository: UserRepository,
) {
    fun listAll(username: String): List<TagResponse> {
        val owner = requireUser(username)
        return tagRepository.findAllByOwnerOrderByName(owner).map { it.toResponse() }
    }

    fun create(
        username: String,
        request: CreateTagRequest,
    ): TagResponse {
        val owner = requireUser(username)
        if (tagRepository.existsByNameAndOwner(request.name, owner)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Tag '${request.name}' already exists")
        }
        return tagRepository.save(Tag(name = request.name, color = request.color, owner = owner)).toResponse()
    }

    fun delete(
        username: String,
        id: UUID,
    ) {
        val owner = requireUser(username)
        val tag =
            tagRepository.findByIdAndOwner(id, owner)
                ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Tag not found")
        tagRepository.delete(tag)
    }

    private fun requireUser(username: String): User =
        userRepository.findByUsername(username)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
}

fun Tag.toResponse() = TagResponse(id = id, name = name, color = color)
