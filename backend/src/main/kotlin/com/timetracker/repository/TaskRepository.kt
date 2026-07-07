package com.timetracker.repository

import com.timetracker.model.Project
import com.timetracker.model.Tag
import com.timetracker.model.Task
import com.timetracker.model.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
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

    // ── tag-filtered queries for personal task list ─────────────────────────

    @Query(
        "SELECT DISTINCT t FROM Task t JOIN t.tags tag " +
            "WHERE t.owner = :owner AND tag = :tag " +
            "ORDER BY t.startTime DESC",
    )
    fun findAllByOwnerAndTagOrderByStartTimeDesc(
        @Param("owner") owner: User,
        @Param("tag") tag: Tag,
    ): List<Task>

    @Query(
        "SELECT DISTINCT t FROM Task t JOIN t.tags tag " +
            "WHERE t.owner = :owner AND tag = :tag " +
            "AND t.startTime >= :from AND t.startTime < :to " +
            "ORDER BY t.startTime DESC",
    )
    fun findByOwnerAndTimeRangeAndTag(
        @Param("owner") owner: User,
        @Param("from") from: Instant,
        @Param("to") to: Instant,
        @Param("tag") tag: Tag,
    ): List<Task>

    // ── project task queries (shared projects) ──────────────────────────────

    @Query(
        "SELECT DISTINCT t FROM Task t JOIN t.projects p " +
            "WHERE p IN :projects AND t.owner = :owner " +
            "ORDER BY t.startTime DESC",
    )
    fun findDistinctByProjectsIn(
        @Param("projects") projects: Collection<Project>,
        @Param("owner") owner: User,
    ): List<Task>

    @Query(
        "SELECT DISTINCT t FROM Task t JOIN t.projects p " +
            "WHERE p IN :projects AND t.owner = :owner " +
            "AND t.startTime >= :from AND t.startTime < :to " +
            "ORDER BY t.startTime DESC",
    )
    fun findDistinctByProjectsInAndTimeRange(
        @Param("projects") projects: Collection<Project>,
        @Param("owner") owner: User,
        @Param("from") from: Instant,
        @Param("to") to: Instant,
    ): List<Task>

    @Query(
        "SELECT DISTINCT t FROM Task t JOIN t.projects p " +
            "WHERE p IN :projects " +
            "ORDER BY t.startTime DESC",
    )
    fun findAllByProjectsIn(
        @Param("projects") projects: Collection<Project>,
    ): List<Task>

    @Query(
        "SELECT DISTINCT t FROM Task t JOIN t.projects p " +
            "WHERE p IN :projects " +
            "AND t.startTime >= :from AND t.startTime < :to " +
            "ORDER BY t.startTime DESC",
    )
    fun findAllByProjectsInAndTimeRange(
        @Param("projects") projects: Collection<Project>,
        @Param("from") from: Instant,
        @Param("to") to: Instant,
    ): List<Task>

    // ── project task queries with tag filter ────────────────────────────────

    @Query(
        "SELECT DISTINCT t FROM Task t JOIN t.projects p JOIN t.tags tag " +
            "WHERE p IN :projects AND tag = :tag " +
            "ORDER BY t.startTime DESC",
    )
    fun findAllByProjectsInAndTag(
        @Param("projects") projects: Collection<Project>,
        @Param("tag") tag: Tag,
    ): List<Task>

    @Query(
        "SELECT DISTINCT t FROM Task t JOIN t.projects p JOIN t.tags tag " +
            "WHERE p IN :projects AND tag = :tag " +
            "AND t.startTime >= :from AND t.startTime < :to " +
            "ORDER BY t.startTime DESC",
    )
    fun findAllByProjectsInAndTagAndTimeRange(
        @Param("projects") projects: Collection<Project>,
        @Param("tag") tag: Tag,
        @Param("from") from: Instant,
        @Param("to") to: Instant,
    ): List<Task>
}
