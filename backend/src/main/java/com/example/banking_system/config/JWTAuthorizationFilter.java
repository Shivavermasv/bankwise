package com.example.banking_system.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class JWTAuthorizationFilter extends BasicAuthenticationFilter {

    private static final Logger log = LoggerFactory.getLogger(JWTAuthorizationFilter.class);

    public JWTAuthorizationFilter(AuthenticationManager authenticationManager) {
        super(authenticationManager);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
        String header = request.getHeader(SecurityConstants.HEADER_STRING);
        log.debug("Processing request: {} {}", request.getMethod(), request.getRequestURI());
        log.debug("Authorization header present: {}", header != null);
        
        if (header == null || !header.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            log.debug("No valid Authorization header found, continuing filter chain");
            chain.doFilter(request, response);
            return;
        }

        log.debug("Authorization header starts with Bearer, attempting to parse JWT");
        UsernamePasswordAuthenticationToken authentication = getAuthentication(request);
        if (authentication != null) {
            log.debug("JWT validated successfully for user: {}", authentication.getName());
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } else {
            log.warn("JWT validation failed, authentication is null");
        }
        chain.doFilter(request, response);
    }

    private UsernamePasswordAuthenticationToken getAuthentication(HttpServletRequest request) {
        String token = request.getHeader(SecurityConstants.HEADER_STRING);
        if (token != null) {
            try {
                String jwtToken = token.replace(SecurityConstants.TOKEN_PREFIX, "").trim();
                log.debug("Parsing JWT token (length={})", jwtToken.length());
                
                Claims claims = Jwts.parser()
                        .setSigningKey(SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))
                        .parseClaimsJws(jwtToken)
                        .getBody();

                String user = claims.getSubject();
                log.debug("JWT subject (user): {}", user);

                @SuppressWarnings("unchecked")
                List<String> roles = claims.get("roles", List.class);
                log.debug("JWT roles: {}", roles);

                List<GrantedAuthority> authorities = new ArrayList<>();
                if (roles != null) {
                    for (String role : roles) {
                        authorities.add(new SimpleGrantedAuthority(role.startsWith("ROLE_") ? role : "ROLE_" + role));
                    }
                }

                if (user != null) {
                    return new UsernamePasswordAuthenticationToken(user, null, authorities);
                }
            } catch (Exception e) {
                log.warn("JWT parsing failed: {} - {}", e.getClass().getSimpleName(), e.getMessage());
            }
        }
        return null;
    }

}




