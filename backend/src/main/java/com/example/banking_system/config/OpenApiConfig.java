package com.example.banking_system.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "Bankwise API",
        version = "1.0",
        description = """
            Comprehensive Banking System API
            
            ## Authentication
            Most endpoints require JWT authentication. To use authenticated endpoints:
            1. Login via POST /api/login with email and password
            2. Complete OTP verification via POST /api/verify-otp
            3. Use the returned token in the Authorization header: `Bearer <token>`
            
            ## Roles
            - **USER/CUSTOMER**: Regular bank customers
            - **ADMIN**: Full system access
            - **MANAGER**: Account approval and management
            - **DEVELOPER**: System monitoring and debugging
            
            ## Test Credentials
            - For development/testing, you can use the Developer login endpoint
            """,
        contact = @Contact(
            name = "Bankwise Support",
            email = "support@bankwise.com"
        ),
        license = @License(
            name = "MIT License"
        )
    ),
    servers = {
        @Server(url = "/", description = "Current Server")
    },
    security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    bearerFormat = "JWT",
    scheme = "bearer",
    description = "JWT Authentication. Get token from /api/login -> /api/verify-otp flow",
    in = SecuritySchemeIn.HEADER
)
public class OpenApiConfig {
}
