package com.timetracker.controller

import com.timetracker.dto.TaskResponse
import com.timetracker.service.OverviewService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/overview")
class OverviewController(
    private val overviewService: OverviewService,
) {
    @GetMapping("/day")
    fun getDay(
        @AuthenticationPrincipal username: String,
        @RequestParam(required = false) tagId: UUID?,
    ): ResponseEntity<List<TaskResponse>> = ResponseEntity.ok(overviewService.getDay(username, tagId))

    @GetMapping("/week")
    fun getWeek(
        @AuthenticationPrincipal username: String,
        @RequestParam(required = false) tagId: UUID?,
    ): ResponseEntity<List<TaskResponse>> = ResponseEntity.ok(overviewService.getWeek(username, tagId))

    @GetMapping("/month")
    fun getMonth(
        @AuthenticationPrincipal username: String,
        @RequestParam(required = false) tagId: UUID?,
    ): ResponseEntity<List<TaskResponse>> = ResponseEntity.ok(overviewService.getMonth(username, tagId))
}
