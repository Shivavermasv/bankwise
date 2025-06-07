package com.example.banking_system.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NonNull;
import lombok.Setter;
import org.springframework.context.annotation.Primary;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Setter
@Getter
@Entity
public class Client implements UserDetails {

    @Id
    private String name;
    @NonNull
    private LocalDate dateOfBirth;
    @NonNull
    private String email;
    @NonNull
    private String phone;
    @NonNull
	private String password;

    @OneToOne(cascade = CascadeType.ALL)
    private Account account;


    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return null;
    }

    @Override
    public String getUsername() {
        return this.name;
    }

}

