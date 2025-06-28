package com.example.banking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.banking_system.entity.User;
import com.example.banking_system.service.UserService;

@RestController
@RequestMapping("/api/")
public class UserController {

    @Autowired
    private UserService UserService;

    @PostMapping("/create")
    public ResponseEntity<User> createUser(@RequestBody User User) {
        User createdUser = UserService.createUser(User);
        return ResponseEntity.ok(createdUser);
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/test")
    @CrossOrigin(origins = "http://localhost:8091")
    public String test() {
        return "CORS is configured!";
    }

}
