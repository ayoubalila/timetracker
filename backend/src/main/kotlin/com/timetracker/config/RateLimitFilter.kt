package com.timetracker.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.util.concurrent.ConcurrentHashMap

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RateLimitFilter(
    @Value("\${app.rate-limit.max-requests:10}") val maxRequests: Int,
    @Value("\${app.rate-limit.window-ms:60000}") val windowMs: Long,
) : OncePerRequestFilter() {
    private val rateLimitedPaths = setOf("/api/auth/login", "/api/auth/register")
    internal val requests = ConcurrentHashMap<String, ArrayDeque<Long>>()

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        if (request.requestURI !in rateLimitedPaths) {
            chain.doFilter(request, response)
            return
        }

        val ip = request.remoteAddr
        val now = System.currentTimeMillis()
        val timestamps = requests.computeIfAbsent(ip) { ArrayDeque() }

        synchronized(timestamps) {
            val cutoff = now - windowMs
            while (timestamps.isNotEmpty() && timestamps.first() < cutoff) {
                timestamps.removeFirst()
            }
            if (timestamps.size >= maxRequests) {
                response.status = 429
                response.contentType = "application/json"
                response.writer.write("""{"status":429,"detail":"Too many requests — try again later"}""")
                return
            }
            timestamps.addLast(now)
        }

        chain.doFilter(request, response)
    }
}
