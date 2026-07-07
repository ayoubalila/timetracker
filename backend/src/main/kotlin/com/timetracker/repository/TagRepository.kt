package com.timetracker.repository

import com.timetracker.model.Tag
import com.timetracker.model.User
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface TagRepository : JpaRepository<Tag, UUID> {
    fun findAllByOwnerOrderByName(owner: User): List<Tag>

    fun findByIdAndOwner(
        id: UUID,
        owner: User,
    ): Tag?

    fun existsByNameAndOwner(
        name: String,
        owner: User,
    ): Boolean
}
