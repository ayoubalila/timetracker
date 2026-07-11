package com.timetracker.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "project")
class Project(
    @Id
    val id: UUID = UUID.randomUUID(),
    @Column(nullable = false, length = 100)
    var name: String,
    @Column(columnDefinition = "TEXT")
    var description: String? = null,
    @Column(length = 7)
    var color: String? = null,
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    var parent: Project? = null,
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    val owner: User,
    @Column(nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
    @Column(name = "budget_seconds")
    var budgetSeconds: Long? = null,
    @Column(name = "budget_period", length = 20)
    var budgetPeriod: String? = null,
    @Column(name = "hourly_rate", precision = 10, scale = 2)
    var hourlyRate: BigDecimal? = null,
)
