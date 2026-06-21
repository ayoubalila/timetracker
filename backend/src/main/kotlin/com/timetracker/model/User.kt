package com.timetracker.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "users")
class User(
    @Id
    val id: UUID = UUID.randomUUID(),
    @Column(nullable = false, unique = true, length = 50)
    var username: String,
    @Column(nullable = false, unique = true, length = 255)
    var email: String,
    @Column(nullable = false, length = 255)
    var password: String,
    @Column(nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
)
