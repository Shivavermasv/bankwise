package com.example.banking_system.service;

import com.example.banking_system.enums.Role;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.entity.UserSearch;
import com.example.banking_system.entity.TransactionHistory;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import com.example.banking_system.repository.TransactionHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;


@Service
public class UserService {
    @Autowired
    private TransactionHistoryRepository transactionHistoryRepository;

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

    private static <T> List<T> optionalToList(Optional<T> optional) {
        return optional.map(Collections::singletonList).orElse(Collections.emptyList());
    }

    public List<UserSearch> searchUsers(String name, String phone, String email) {
        List<User> res = new ArrayList<>();
        if (name != null && !name.isEmpty()) {
            res = optionalToList(userRepository.findByNameContaining(name));
        }
        else if (phone != null && !phone.isEmpty()) {
            res.addAll(userRepository.findByPhone(phone));
        }
        else if (email != null && !email.isEmpty()) {
            //res.addAll(userRepository.findByEmail(email));
        }
        else{
            res = userRepository.findAllUsers();
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
        Optional<User> optionalUser = userRepository.findById(UserId);
        if (optionalUser.isPresent()) {
            User existingUser = optionalUser.get();
            existingUser.setName(User.getName());
            existingUser.setDateOfBirth(User.getDateOfBirth());
            existingUser.setPhone(User.getPhone());
            existingUser.setEmail(User.getEmail());
            return userRepository.save(existingUser);
        } else {
            throw new RuntimeException("User not found");
        }
    }

    @Transactional
    public String deleteUser(String pass) {
        if (!userRepository.existsById(getLoggedInUser().getName()) ) {
            throw new RuntimeException("User not found");
        }
        User User = getLoggedInUser();
        if(!passwordEncoder.matches(pass, User.getPassword())) {
            return "Wrong password";
        }
        //transactionHistoryRepository.deleteById(User.getAccount().getId());
        userRepository.deleteById(User.getName());
        return "SUCCESSFULLY DELETED";
    }

    private User updateUserDetail(String UserId, String field, String newValue) {
        return updateUserDetail(UserId, field, newValue, null);
    }

    private User updateUserDetail(String UserId, String field, String newValue, String oldValue) {
        Optional<User> optionalUser = userRepository.findById(UserId);
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
            return userRepository.save(User);
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
            assert userRepository != null;
            return userRepository.findByNameContaining((String) authentication.getPrincipal()).get();
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
}
