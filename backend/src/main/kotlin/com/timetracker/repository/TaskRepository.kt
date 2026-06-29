package com.timetracker.repository

import com.timetracker.model.Task
import com.timetracker.model.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.util.UUID

interface TaskRepository : JpaRepository<Task, UUID> {
    fun findAllByOwnerOrderByStartTimeDesc(owner: User): List<Task>

    fun findByOwnerAndEndTimeIsNull(owner: User): Task?

    fun existsByOwnerAndEndTimeIsNull(owner: User): Boolean

    fun findByIdAndOwner(
        id: UUID,
        owner: User,
    ): Task?

    @Query(
        "SELECT t FROM Task t WHERE t.owner = :owner " +
            "AND t.startTime >= :from AND t.startTime < :to " +
            "ORDER BY t.startTime DESC",
    )
    fun findByOwnerAndTimeRange(
        owner: User,
        from: Instant,
        to: Instant,
    ): List<Task>
}
