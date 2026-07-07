package com.timetracker.controller

import com.timetracker.dto.CreateTagRequest
import com.timetracker.dto.TagResponse
import com.timetracker.service.TagService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/tags")
class TagController(private val tagService: TagService) {
    @GetMapping
    fun listAll(
        @AuthenticationPrincipal username: String,
    ): ResponseEntity<List<TagResponse>> = ResponseEntity.ok(tagService.listAll(username))

    @PostMapping
    fun create(
        @AuthenticationPrincipal username: String,
        @Valid @RequestBody request: CreateTagRequest,
    ): ResponseEntity<TagResponse> = ResponseEntity.status(HttpStatus.CREATED).body(tagService.create(username, request))

    @DeleteMapping("/{id}")
    fun delete(
        @AuthenticationPrincipal username: String,
        @PathVariable id: UUID,
    ): ResponseEntity<Void> {
        tagService.delete(username, id)
        return ResponseEntity.noContent().build()
    }
}
