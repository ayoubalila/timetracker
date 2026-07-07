package com.timetracker.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "tag")
class Tag(
    @Id
    val id: UUID = UUID.randomUUID(),
    @Column(nullable = false, length = 50)
    var name: String,
    @Column(nullable = false, length = 7)
    var color: String,
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    val owner: User,
)
