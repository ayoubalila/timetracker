package com.timetracker.unit

import com.timetracker.dto.TaskResponse
import com.timetracker.service.OverviewService
import com.timetracker.service.TaskService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneOffset
import java.time.temporal.TemporalAdjusters
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class OverviewServiceTest {
    private val taskService: TaskService = mock()
    private val service = OverviewService(taskService)

    private fun taskResponse() =
        TaskResponse(
            id = UUID.randomUUID(),
            description = "Test",
            startTime = Instant.now().minusSeconds(60),
            endTime = Instant.now(),
            projectIds = emptyList(),
            createdAt = Instant.now(),
            updatedAt = Instant.now(),
        )

    @Test
    fun `getDay delegates to taskService with today range`() {
        val expected = listOf(taskResponse())
        whenever(taskService.listAll(any(), any(), any())).thenReturn(expected)

        val result = service.getDay("alice")

        assertEquals(expected, result)
        val fromCaptor = argumentCaptor<Instant>()
        val toCaptor = argumentCaptor<Instant>()
        verify(taskService).listAll(any(), fromCaptor.capture(), toCaptor.capture())
        val from = fromCaptor.firstValue
        val to = toCaptor.firstValue
        assertTrue(to.isAfter(from))
        // range spans exactly one day (86400 seconds)
        assertEquals(86400L, to.epochSecond - from.epochSecond)
    }

    @Test
    fun `getWeek delegates to taskService with Mon–Sun range`() {
        whenever(taskService.listAll(any(), any(), any())).thenReturn(emptyList())

        service.getWeek("alice")

        val fromCaptor = argumentCaptor<Instant>()
        val toCaptor = argumentCaptor<Instant>()
        verify(taskService).listAll(any(), fromCaptor.capture(), toCaptor.capture())
        val from = fromCaptor.firstValue
        val to = toCaptor.firstValue
        // range spans exactly one week (7 days = 604800 seconds)
        assertEquals(604800L, to.epochSecond - from.epochSecond)
        // from is a Monday midnight UTC
        val fromDay = from.atZone(ZoneOffset.UTC).dayOfWeek
        assertEquals(DayOfWeek.MONDAY, fromDay)
    }

    @Test
    fun `getMonth delegates to taskService with first-to-last of month range`() {
        whenever(taskService.listAll(any(), any(), any())).thenReturn(emptyList())

        service.getMonth("alice")

        val fromCaptor = argumentCaptor<Instant>()
        val toCaptor = argumentCaptor<Instant>()
        verify(taskService).listAll(any(), fromCaptor.capture(), toCaptor.capture())
        val from = fromCaptor.firstValue
        val to = toCaptor.firstValue
        assertTrue(to.isAfter(from))
        // from is the 1st of month at midnight UTC
        val fromDate = from.atZone(ZoneOffset.UTC)
        assertEquals(1, fromDate.dayOfMonth)
        // to is the 1st of next month
        val toDate = to.atZone(ZoneOffset.UTC)
        assertEquals(1, toDate.dayOfMonth)
        // months differ by 1
        val expectedNextMonth = fromDate.toLocalDate().with(TemporalAdjusters.firstDayOfNextMonth())
        assertEquals(expectedNextMonth, toDate.toLocalDate())
    }

    @Test
    fun `dayRange from is midnight UTC`() {
        val (from, _) = OverviewService.dayRange()
        val zdt = from.atZone(ZoneOffset.UTC)
        assertEquals(0, zdt.hour)
        assertEquals(0, zdt.minute)
        assertEquals(0, zdt.second)
    }

    @Test
    fun `weekRange from is Monday midnight UTC`() {
        val (from, _) = OverviewService.weekRange()
        val zdt = from.atZone(ZoneOffset.UTC)
        assertEquals(DayOfWeek.MONDAY, zdt.dayOfWeek)
        assertEquals(0, zdt.hour)
    }

    @Test
    fun `monthRange from is first day of month midnight UTC`() {
        val (from, _) = OverviewService.monthRange()
        val zdt = from.atZone(ZoneOffset.UTC)
        assertEquals(1, zdt.dayOfMonth)
        assertEquals(0, zdt.hour)
    }
}
