package com.example.banking_system.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            String tokenHeader = accessor.getFirstNativeHeader("token");

            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring("Bearer ".length());
            } else if (tokenHeader != null) {
                token = tokenHeader;
            }

            if (token != null) {
                try {
                    Claims claims = Jwts.parser()
                            .setSigningKey(SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))
                            .parseClaimsJws(token)
                            .getBody();

                    String user = claims.getSubject();
                    @SuppressWarnings("unchecked")
                    List<String> roles = claims.get("roles", List.class);

                    List<GrantedAuthority> authorities = new ArrayList<>();
                    if (roles != null) {
                        for (String role : roles) {
                            authorities.add(new SimpleGrantedAuthority(role.startsWith("ROLE_") ? role : "ROLE_" + role));
                        }
                    }

                    if (user != null) {
                        accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, authorities));
                    }
                } catch (Exception e) {
                    log.warn("STOMP JWT validation failed: {}", e.getMessage());
                    return null; // Reject connection
                }
            }
        }
        return message;
    }
}




