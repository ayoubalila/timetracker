package com.timetracker.service

import com.timetracker.dto.TaskResponse
import org.springframework.stereotype.Service
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneOffset
import java.time.temporal.TemporalAdjusters
import java.util.UUID

@Service
class OverviewService(
    private val taskService: TaskService,
) {
    fun getDay(
        username: String,
        tagId: UUID? = null,
    ): List<TaskResponse> {
        val (from, to) = dayRange()
        return taskService.listAll(username, from, to, tagId)
    }

    fun getWeek(
        username: String,
        tagId: UUID? = null,
    ): List<TaskResponse> {
        val (from, to) = weekRange()
        return taskService.listAll(username, from, to, tagId)
    }

    fun getMonth(
        username: String,
        tagId: UUID? = null,
    ): List<TaskResponse> {
        val (from, to) = monthRange()
        return taskService.listAll(username, from, to, tagId)
    }

    companion object {
        fun dayRange(): Pair<Instant, Instant> {
            val today = LocalDate.now(ZoneOffset.UTC)
            return Pair(
                today.atStartOfDay(ZoneOffset.UTC).toInstant(),
                today.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant(),
            )
        }

        fun weekRange(): Pair<Instant, Instant> {
            val today = LocalDate.now(ZoneOffset.UTC)
            val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            return Pair(
                monday.atStartOfDay(ZoneOffset.UTC).toInstant(),
                monday.plusWeeks(1).atStartOfDay(ZoneOffset.UTC).toInstant(),
            )
        }

        fun monthRange(): Pair<Instant, Instant> {
            val ym = YearMonth.now(ZoneOffset.UTC)
            return Pair(
                ym.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant(),
                ym
                    .plusMonths(1)
                    .atDay(1)
                    .atStartOfDay(ZoneOffset.UTC)
                    .toInstant(),
            )
        }
    }
}
