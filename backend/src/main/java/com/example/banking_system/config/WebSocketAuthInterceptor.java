package com.example.banking_system.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private static final String SECRET = SecurityConstants.SECRET; // use same key as your JWTAuthorizationFilter

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) throws Exception {

        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest httpRequest = servletRequest.getServletRequest();
            String token = httpRequest.getParameter("token"); // ✅ Get token from query param

            if (token != null) {
                try {
                    Claims claims = Jwts.parser()
                            .setSigningKey(SecurityConstants.SECRET.getBytes(StandardCharsets.UTF_8))
                            .parseClaimsJws(token)
                            .getBody();

                    String username = claims.getSubject();

                    @SuppressWarnings("unchecked")
                    List<String> roles = claims.get("roles", List.class);

                    if (username != null) {
                        attributes.put("username", username);
                        attributes.put("roles", roles);
                        return true;
                    }
                } catch (Exception e) {
                    System.out.println("❌ JWT validation failed: " + e.getMessage());
                }
            }
        }

        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return false;
    }


    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // Nothing needed
    }
}
