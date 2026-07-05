package com.timetracker.repository

import com.timetracker.model.Project
import com.timetracker.model.ProjectMember
import com.timetracker.model.User
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ProjectMemberRepository : JpaRepository<ProjectMember, UUID> {
    fun existsByProjectAndUser(
        project: Project,
        user: User,
    ): Boolean

    fun findByProjectAndUser(
        project: Project,
        user: User,
    ): ProjectMember?

    fun findAllByProject(project: Project): List<ProjectMember>

    fun findAllByUser(user: User): List<ProjectMember>
}
