package com.timetracker.controller

import com.timetracker.dto.TaskResponse
import com.timetracker.service.OverviewService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/overview")
class OverviewController(
    private val overviewService: OverviewService,
) {
    @GetMapping("/day")
    fun getDay(
        @AuthenticationPrincipal username: String,
    ): ResponseEntity<List<TaskResponse>> = ResponseEntity.ok(overviewService.getDay(username))

    @GetMapping("/week")
    fun getWeek(
        @AuthenticationPrincipal username: String,
    ): ResponseEntity<List<TaskResponse>> = ResponseEntity.ok(overviewService.getWeek(username))

    @GetMapping("/month")
    fun getMonth(
        @AuthenticationPrincipal username: String,
    ): ResponseEntity<List<TaskResponse>> = ResponseEntity.ok(overviewService.getMonth(username))
}
