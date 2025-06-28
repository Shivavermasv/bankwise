package com.example.banking_system.service;

import com.example.banking_system.enums.Role;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;


@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> getUser() {
        return userRepository.findAll();
    }

    public User getUser(String userName){
        return userRepository.findByEmail(userName).orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userName));
    }

    public User createUser(User user) {
        if (user.getRole() == null) {
            throw new IllegalArgumentException("Role is mandatory for user creation.");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);

        if (Role.USER.equals(savedUser.getRole())) {
            Account account = new Account();
            account.setBalance(BigDecimal.valueOf(5000));
            account.setUser(savedUser);
            accountRepository.save(account);
        }

        return savedUser;
    }

}
