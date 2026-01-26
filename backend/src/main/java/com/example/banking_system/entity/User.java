package com.example.banking_system.entity;

import com.example.banking_system.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Setter
@Getter
@Entity(name = "users")
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private LocalDate dateOfBirth;

    @Column(unique = true, nullable = false)
    private String email;

    private String phone;
	private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String address;

    @Basic(fetch = FetchType.LAZY)
    @Column(columnDefinition = "BYTEA")
    private byte[] profilePhoto;

    private String profilePhotoContentType;

    // Credit score - starts at 700, updated based on loan repayments
    @Builder.Default
    private Integer creditScore = 700;

    // Transaction PIN (hashed) for secure transfers
    private String transactionPin;
    
    // PIN reset token for forgot PIN flow
    private String pinResetToken;
    private LocalDateTime pinResetTokenExpiry;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_"+role.name()));
    }



    @Override
    public String getUsername() {
        return this.email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    @Override
    public boolean isEnabled() {
        return true;
    }


}





