package com.example.banking_system.service;

import com.example.banking_system.model.Account;
import com.example.banking_system.model.Client;
import com.example.banking_system.model.ClientSearch;
import com.example.banking_system.model.TransactionHistory;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.ClientRepository;
import com.example.banking_system.repository.TransactionHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;


@Service
public class ClientService {
    @Autowired
    private TransactionHistoryRepository transactionHistoryRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<Client> getUser() {
        return clientRepository.findAll();
    }

    public Client getClient(String clientName){
        Client client = null;
        try{
            client = clientRepository.findByNameContaining(clientName).get();
        }
        catch (Exception ignored){
        }
        return client;
    }

    public Client createClient(Client client) {
        client.setPassword(passwordEncoder.encode(client.getPassword()));
        Account account = client.getAccount();
        if (account != null) {
            account.setAccountHolderName(client.getName());
            accountRepository.save(account);
        }
        return clientRepository.save(client);
    }

    private static <T> List<T> optionalToList(Optional<T> optional) {
        return optional.map(Collections::singletonList).orElse(Collections.emptyList());
    }

    public List<ClientSearch> searchClients(String name, String phone, String email) {
        List<Client> res = new ArrayList<>();
        if (name != null && !name.isEmpty()) {
            res = optionalToList(clientRepository.findByNameContaining(name));
        }
        else if (phone != null && !phone.isEmpty()) {
            res.addAll(clientRepository.findByPhone(phone));
        }
        else if (email != null && !email.isEmpty()) {
            res.addAll(clientRepository.findByEmail(email));
        }
        else{
            res = clientRepository.findAllClients();
        }
        return mapToTargetClassList(res);
    }
    public static List<ClientSearch> mapToTargetClassList(List<Client> sourceList) {
        return sourceList.stream()
                .map(source -> new ClientSearch(source.getName(), source.getPhone(), source.getAccount().getId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public Client addPhone(String clientId, String phone) {
        return updateClientDetail(clientId, "phone", phone);
    }

    @Transactional
    public Client deletePhone(String clientId, String phone) {
        return updateClientDetail(clientId, "phone", null, phone);
    }

    @Transactional
    public Client addEmail(String clientId, String email) {
        return updateClientDetail(clientId, "email", email);
    }

    @Transactional
    public Client deleteEmail(String clientId, String email) {
        return updateClientDetail(clientId, "email", null, email);
    }

    @Transactional
    public Client updateClient(String clientId, Client client) {
        Optional<Client> optionalClient = clientRepository.findById(clientId);
        if (optionalClient.isPresent()) {
            Client existingClient = optionalClient.get();
            existingClient.setName(client.getName());
            existingClient.setDateOfBirth(client.getDateOfBirth());
            existingClient.setPhone(client.getPhone());
            existingClient.setEmail(client.getEmail());
            return clientRepository.save(existingClient);
        } else {
            throw new RuntimeException("Client not found");
        }
    }

    @Transactional
    public String deleteClient(String pass) {
        if (!clientRepository.existsById(getLoggedInUser().getName()) ) {
            throw new RuntimeException("Client not found");
        }
        Client client = getLoggedInUser();
        if(!passwordEncoder.matches(pass, client.getPassword())) {
            return "Wrong password";
        }
        //transactionHistoryRepository.deleteById(client.getAccount().getId());
        clientRepository.deleteById(client.getName());
        return "SUCCESSFULLY DELETED";
    }

    private Client updateClientDetail(String clientId, String field, String newValue) {
        return updateClientDetail(clientId, field, newValue, null);
    }

    private Client updateClientDetail(String clientId, String field, String newValue, String oldValue) {
        Optional<Client> optionalClient = clientRepository.findById(clientId);
        if (optionalClient.isPresent()) {
            Client client = optionalClient.get();
            if (field.equals("phone")) {
                if (oldValue == null || oldValue.equals(client.getPhone())) {
                    client.setPhone(newValue);
                } else {
                    throw new RuntimeException("Phone number does not match");
                }
            } else if (field.equals("email")) {
                if (oldValue == null || oldValue.equals(client.getEmail())) {
                    client.setEmail(newValue);
                } else {
                    throw new RuntimeException("Email does not match");
                }
            }
            return clientRepository.save(client);
        } else {
            throw new RuntimeException("Client not found");
        }
    }

    public String updateInterestType(int type) {
        Account account = getLoggedInUser().getAccount();
        if (account != null) {
            switch (type) {
                case 1:
                    if(account.getBalance().compareTo(new BigDecimal(5000)) > 0){
                        account.setInterestType(type);
                        accountRepository.save(account);
                        return "UPDATED SUCCESSFULLY";
                    }
                    else{
                        return "NOT ENOUGH BALANCE";
                    }
                case 2:
                    if(account.getBalance().compareTo(new BigDecimal(30000)) > 0){
                        account.setInterestType(type);
                        accountRepository.save(account);
                        return "UPDATED SUCCESSFULLY";
                    }
                    else{
                        return "NOT ENOUGH BALANCE";
                    }
                case 3:
                    if(account.getBalance().compareTo(new BigDecimal(20000)) > 0){
                        account.setInterestType(type);
                        accountRepository.save(account);
                        return "UPDATED SUCCESSFULLY";
                    }
                    else{
                        return "NOT ENOUGH BALANCE";
                    }
            }
        }
        return "ACCOUNT NOT FOUND";
    }

    public Client getLoggedInUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        System.out.println(authentication.getPrincipal() + " " + authentication.getPrincipal().getClass());
        if (authentication.getPrincipal() != null) {
            assert clientRepository != null;
            return clientRepository.findByNameContaining((String) authentication.getPrincipal()).get();
        }
        return null;
    }


    public String depositMoney(Integer amount) {
        if(amount <= 0){
            return "INVALID DEPOSIT";
        }
        Account account = getLoggedInUser().getAccount();
        account.setBalance(account.getBalance().add(new BigDecimal(amount)));
        accountRepository.save(account);
        TransactionHistory toTransaction = new TransactionHistory();
        toTransaction.setAccount(account); // Ensure the correct account is set
        toTransaction.setAmount(new BigDecimal(amount)); // Positive amount for credit
        toTransaction.setTransactionType("credit");
        toTransaction.setTransactionDate(LocalDateTime.now());
        toTransaction.setDescription("Deposited to " + account.getId());
        transactionHistoryRepository.save(toTransaction);
        return "DEPOSITED SUCCESSFULLY";
    }

    public Account getAccount() {
        return getLoggedInUser().getAccount();
    }
}
