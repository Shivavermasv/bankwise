package com.example.banking_system.service;

import com.example.banking_system.model.Account;
import com.example.banking_system.model.User;
import com.example.banking_system.model.UserSearch;
import com.example.banking_system.model.TransactionHistory;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
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
public class UserService {
    @Autowired
    private TransactionHistoryRepository transactionHistoryRepository;

    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> getUser() {
        return UserRepository.findAll();
    }

    public User getUser(String UserName){
        User User = null;
        try{
            User = UserRepository.findByNameContaining(UserName).get();
        }
        catch (Exception ignored){
        }
        return User;
    }

    public User createUser(User User) {
        User.setPassword(passwordEncoder.encode(User.getPassword()));
//        Account account = User.getAccount();
//        if (account != null) {
//            account.setAccountHolderName(User.getName());
//            accountRepository.save(account);
//        }
        return UserRepository.save(User);
    }

    private static <T> List<T> optionalToList(Optional<T> optional) {
        return optional.map(Collections::singletonList).orElse(Collections.emptyList());
    }

    public List<UserSearch> searchUsers(String name, String phone, String email) {
        List<User> res = new ArrayList<>();
        if (name != null && !name.isEmpty()) {
            res = optionalToList(UserRepository.findByNameContaining(name));
        }
        else if (phone != null && !phone.isEmpty()) {
            res.addAll(UserRepository.findByPhone(phone));
        }
        else if (email != null && !email.isEmpty()) {
            res.addAll(UserRepository.findByEmail(email));
        }
        else{
            res = UserRepository.findAllUsers();
        }
        return mapToTargetClassList(res);
    }
    public static List<UserSearch> mapToTargetClassList(List<User> sourceList) {
//        return sourceList.stream()
//                .map(source -> new UserSearch(source.getName(), source.getPhone(), source.getAccount().getId()))
//                .collect(Collectors.toList());
        return null;
    }

    @Transactional
    public User addPhone(String UserId, String phone) {
        return updateUserDetail(UserId, "phone", phone);
    }

    @Transactional
    public User deletePhone(String UserId, String phone) {
        return updateUserDetail(UserId, "phone", null, phone);
    }

    @Transactional
    public User addEmail(String UserId, String email) {
        return updateUserDetail(UserId, "email", email);
    }

    @Transactional
    public User deleteEmail(String UserId, String email) {
        return updateUserDetail(UserId, "email", null, email);
    }

    @Transactional
    public User updateUser(String UserId, User User) {
        Optional<User> optionalUser = UserRepository.findById(UserId);
        if (optionalUser.isPresent()) {
            User existingUser = optionalUser.get();
            existingUser.setName(User.getName());
            existingUser.setDateOfBirth(User.getDateOfBirth());
            existingUser.setPhone(User.getPhone());
            existingUser.setEmail(User.getEmail());
            return UserRepository.save(existingUser);
        } else {
            throw new RuntimeException("User not found");
        }
    }

    @Transactional
    public String deleteUser(String pass) {
        if (!UserRepository.existsById(getLoggedInUser().getName()) ) {
            throw new RuntimeException("User not found");
        }
        User User = getLoggedInUser();
        if(!passwordEncoder.matches(pass, User.getPassword())) {
            return "Wrong password";
        }
        //transactionHistoryRepository.deleteById(User.getAccount().getId());
        UserRepository.deleteById(User.getName());
        return "SUCCESSFULLY DELETED";
    }

    private User updateUserDetail(String UserId, String field, String newValue) {
        return updateUserDetail(UserId, field, newValue, null);
    }

    private User updateUserDetail(String UserId, String field, String newValue, String oldValue) {
        Optional<User> optionalUser = UserRepository.findById(UserId);
        if (optionalUser.isPresent()) {
            User User = optionalUser.get();
            if (field.equals("phone")) {
                if (oldValue == null || oldValue.equals(User.getPhone())) {
                    User.setPhone(newValue);
                } else {
                    throw new RuntimeException("Phone number does not match");
                }
            } else if (field.equals("email")) {
                if (oldValue == null || oldValue.equals(User.getEmail())) {
                    User.setEmail(newValue);
                } else {
                    throw new RuntimeException("Email does not match");
                }
            }
            return UserRepository.save(User);
        } else {
            throw new RuntimeException("User not found");
        }
    }

    public String updateInterestType(int type) {
        Account account = null;
        if (account != null) {
            switch (type) {
                case 1:
                    if(account.getBalance().compareTo(new BigDecimal(5000)) > 0){
//                        account.setInterestType(type);
                        accountRepository.save(account);
                        return "UPDATED SUCCESSFULLY";
                    }
                    else{
                        return "NOT ENOUGH BALANCE";
                    }
                case 2:
                    if(account.getBalance().compareTo(new BigDecimal(30000)) > 0){
                       // account.setInterestType(type);
                        accountRepository.save(account);
                        return "UPDATED SUCCESSFULLY";
                    }
                    else{
                        return "NOT ENOUGH BALANCE";
                    }
                case 3:
                    if(account.getBalance().compareTo(new BigDecimal(20000)) > 0){
//                        account.setInterestType(type);
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

    public User getLoggedInUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        System.out.println(authentication.getPrincipal() + " " + authentication.getPrincipal().getClass());
        if (authentication.getPrincipal() != null) {
            assert UserRepository != null;
            return UserRepository.findByNameContaining((String) authentication.getPrincipal()).get();
        }
        return null;
    }


    public String depositMoney(Integer amount) {
        if(amount <= 0){
            return "INVALID DEPOSIT";
        }
        Account account = null;
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
       // return getLoggedInUser().getAccount();
        return null;
    }
}
