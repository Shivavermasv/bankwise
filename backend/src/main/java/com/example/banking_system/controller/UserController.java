package com.example.banking_system.controller;

import com.example.banking_system.model.Account;
import com.example.banking_system.model.TransactionHistory;
import com.example.banking_system.service.TransactionHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.banking_system.model.User;
import com.example.banking_system.service.UserService;
import com.example.banking_system.service.TransferService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/")
public class UserController {
    @Autowired
    private TransactionHistoryService transactionHistoryService;

    @Autowired
    private UserService UserService;

    @Autowired
    private TransferService transferService;



    @PostMapping("/create")
    public ResponseEntity<User> createUser(@RequestBody User User) {
        User createdUser = UserService.createUser(User);
        return ResponseEntity.ok(createdUser);
    }

    @GetMapping("/transactions")
    public List<TransactionHistory> getTransactionHistory() {
        return transactionHistoryService.getTransactionHistoryByAccountId();
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/test")
    @CrossOrigin(origins = "http://localhost:8091")
    public String test() {
        return "CORS is configured!";
    }



    @GetMapping("/search")
    public ResponseEntity<?> searchUsers(@RequestParam(required = false) String name,
                                           @RequestParam(required = false) String phone,
                                           @RequestParam(required = false) String email) {
        if(UserService.searchUsers(name,phone,email) == null) return ResponseEntity.ok("NO USER FOUND !!");
        return ResponseEntity.ok(UserService.searchUsers(name, phone, email));
    }

    @PutMapping("/deposit")
    public ResponseEntity<String> deposit(@RequestParam Integer amount){
        return ResponseEntity.ok(UserService.depositMoney(amount));
    }

    @PutMapping("/updateIT")
    public ResponseEntity<String> updateInterestType(@RequestParam int type){
        return ResponseEntity.ok(UserService.updateInterestType(type));
    }

    @PostMapping("/transfer")
    public ResponseEntity<String> transferMoney(@RequestParam String toAccount,@RequestParam BigDecimal amount) {
        User to = UserService.getUser(toAccount);
        if(to == null){
            return ResponseEntity.ok("INVALID ACCOUNT NAME");
        }
        transferService.transferMoney(to, amount);
        return ResponseEntity.ok("Transfer successful");
    }

    @PutMapping("/{UserId}/phones")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<User> addPhone(@PathVariable String UserId, @RequestBody String phone) {
        User updatedUser = UserService.addPhone(UserId, phone);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{UserId}/phones/{phone}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<User> deletePhone(@PathVariable String UserId, @PathVariable String phone) {
        User updatedUser = UserService.deletePhone(UserId, phone);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{UserId}/emails")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<User> addEmail(@PathVariable String UserId, @RequestBody String email) {
        User updatedUser = UserService.addEmail(UserId, email);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{UserId}/emails/{email}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<User> deleteEmail(@PathVariable String UserId, @PathVariable String email) {
        User updatedUser = UserService.deleteEmail(UserId, email);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{UserId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<User> updateUser(@PathVariable String UserId, @RequestBody User User) {
        User updatedUser = UserService.updateUser(UserId, User);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/delete")
    public ResponseEntity<String> deleteUser(@RequestParam String password) {
        return ResponseEntity.ok(UserService.deleteUser(password));
    }

    @GetMapping("/status")
    public ResponseEntity<?> getAccountStatus() {
        Account account = UserService.getAccount();
        return ResponseEntity.ok(Objects.requireNonNullElse(account, "NOT FOUND"));
    }
}
