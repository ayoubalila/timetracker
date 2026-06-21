package com.timetracker.service

import com.timetracker.config.JwtProperties
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import java.util.Base64
import java.util.Date

@Service
class JwtService(
    private val jwtProperties: JwtProperties,
) {
    private val signingKey by lazy {
        val decodedKey = Base64.getDecoder().decode(jwtProperties.secret)
        Keys.hmacShaKeyFor(decodedKey)
    }

    fun generateToken(username: String): String =
        Jwts
            .builder()
            .subject(username)
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + jwtProperties.expirationMs))
            .signWith(signingKey)
            .compact()

    fun extractUsername(token: String): String =
        Jwts
            .parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .payload
            .subject

    fun isTokenValid(token: String): Boolean =
        try {
            Jwts
                .parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
            true
        } catch (_: JwtException) {
            false
        } catch (_: IllegalArgumentException) {
            false
        }
}
