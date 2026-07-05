package com.timetracker.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.util.UUID

@Entity
@Table(
    name = "project_member",
    uniqueConstraints = [UniqueConstraint(columnNames = ["project_id", "user_id"])],
)
class ProjectMember(
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    val project: Project,
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,
    @Column(nullable = false, length = 20)
    val role: String = "MEMBER",
    @Id
    val id: UUID = UUID.randomUUID(),
)
