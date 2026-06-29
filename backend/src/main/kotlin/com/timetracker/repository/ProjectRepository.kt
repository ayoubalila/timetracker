package com.timetracker.repository

import com.timetracker.model.Project
import com.timetracker.model.User
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ProjectRepository : JpaRepository<Project, UUID> {
    fun findAllByOwner(owner: User): List<Project>

    fun findByIdAndOwner(
        id: UUID,
        owner: User,
    ): Project?

    fun existsByOwnerAndNameAndParentIsNull(
        owner: User,
        name: String,
    ): Boolean

    fun existsByOwnerAndNameAndParent(
        owner: User,
        name: String,
        parent: Project,
    ): Boolean
}
