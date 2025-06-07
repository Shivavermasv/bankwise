package com.example.banking_system.controllers;

import com.example.banking_system.model.Account;
import com.example.banking_system.model.TransactionHistory;
import com.example.banking_system.service.TransactionHistoryService;
import lombok.Synchronized;
import org.hibernate.annotations.Synchronize;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.example.banking_system.model.Client;
import com.example.banking_system.service.ClientService;
import com.example.banking_system.service.TransferService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/")
public class ClientController {
    @Autowired
    private TransactionHistoryService transactionHistoryService;

    @Autowired
    private ClientService clientService;

    @Autowired
    private TransferService transferService;



    @PostMapping("/create")
    public ResponseEntity<Client> createClient(@RequestBody Client client) {
        // Initialize account with a balance of 5000
        client.setAccount(new Account());
        client.setPassword(client.getPassword()); // Ensure you have access to the password encoder bean
        Client createdClient = clientService.createClient(client);
        return ResponseEntity.ok(createdClient);
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
    public ResponseEntity<?> searchClients(@RequestParam(required = false) String name,
                                           @RequestParam(required = false) String phone,
                                           @RequestParam(required = false) String email) {
        if(clientService.searchClients(name,phone,email) == null) return ResponseEntity.ok("NO USER FOUND !!");
        return ResponseEntity.ok(clientService.searchClients(name, phone, email));
    }

    @PutMapping("/deposit")
    public ResponseEntity<String> deposit(@RequestParam Integer amount){
        return ResponseEntity.ok(clientService.depositMoney(amount));
    }

    @PutMapping("/updateIT")
    public ResponseEntity<String> updateInterestType(@RequestParam int type){
        return ResponseEntity.ok(clientService.updateInterestType(type));
    }

    @PostMapping("/transfer")
    public ResponseEntity<String> transferMoney(@RequestParam String toAccount,@RequestParam BigDecimal amount) {
        Client to = clientService.getClient(toAccount);
        if(to == null){
            return ResponseEntity.ok("INVALID ACCOUNT NAME");
        }
        transferService.transferMoney(to, amount);
        return ResponseEntity.ok("Transfer successful");
    }

    @PutMapping("/{clientId}/phones")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Client> addPhone(@PathVariable String clientId, @RequestBody String phone) {
        Client updatedClient = clientService.addPhone(clientId, phone);
        return ResponseEntity.ok(updatedClient);
    }

    @DeleteMapping("/{clientId}/phones/{phone}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Client> deletePhone(@PathVariable String clientId, @PathVariable String phone) {
        Client updatedClient = clientService.deletePhone(clientId, phone);
        return ResponseEntity.ok(updatedClient);
    }

    @PutMapping("/{clientId}/emails")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Client> addEmail(@PathVariable String clientId, @RequestBody String email) {
        Client updatedClient = clientService.addEmail(clientId, email);
        return ResponseEntity.ok(updatedClient);
    }

    @DeleteMapping("/{clientId}/emails/{email}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Client> deleteEmail(@PathVariable String clientId, @PathVariable String email) {
        Client updatedClient = clientService.deleteEmail(clientId, email);
        return ResponseEntity.ok(updatedClient);
    }

    @PutMapping("/{clientId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Client> updateClient(@PathVariable String clientId, @RequestBody Client client) {
        Client updatedClient = clientService.updateClient(clientId, client);
        return ResponseEntity.ok(updatedClient);
    }

    @DeleteMapping("/delete")
    public ResponseEntity<String> deleteClient(@RequestParam String password) {
        return ResponseEntity.ok(clientService.deleteClient(password));
    }

    @GetMapping("/status")
    public ResponseEntity<?> getAccountStatus() {
        Account account = clientService.getAccount();
        return ResponseEntity.ok(Objects.requireNonNullElse(account, "NOT FOUND"));
    }
}
