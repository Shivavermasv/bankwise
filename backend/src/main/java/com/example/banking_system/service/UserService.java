package com.example.banking_system.service;

import com.example.banking_system.dto.CreateRequestDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.AccountType;
import com.example.banking_system.enums.Role;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;


@Service
@RequiredArgsConstructor
public class UserService {

    private final NotificationService notificationService;

    private final UserRepository userRepository;

    private final AccountRepository accountRepository;

    private final PasswordEncoder passwordEncoder;


    private static final long OTP_SESSION_TTL = 10 * 60;

    public List<User> getUser() {
        return userRepository.findAll();
    }

    public User getUser(String userName){
        return userRepository.findByEmail(userName).orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userName));
    }

    @Transactional
    public Object createUser(CreateRequestDto createRequestDto) {
        User user = User.builder()
                .role(createRequestDto.getRole())
                .address(createRequestDto.getAddress())
                .phone(createRequestDto.getPhoneNumber())
                .email(createRequestDto.getEmail())
                .dateOfBirth(createRequestDto.getDateOfBirth())
                .name(createRequestDto.getUserName())
                .password(createRequestDto.getPassword())
                .build();

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser;
        if (Role.USER.equals(user.getRole())) {
            Account account = new Account();
            account.setBalance(BigDecimal.valueOf(5000));
            account.setUser(user);
            account.setAccountType(AccountType.valueOf(createRequestDto.getAccountType()));
            if(createRequestDto.getAccountType().equals("SAVINGS")){
                account.setInterestRate(0.08);
            }
            else if(createRequestDto.getAccountType().equals("CURRENT")){
                account.setInterestRate(0.00);
            } else {
                throw new IllegalArgumentException("Invalid account type");
            }

            accountRepository.save(account);


            for(User admins : userRepository.findByRole(Role.ADMIN)){
                notificationService.sendNotification(admins.getEmail(),
                        "A new user has been created with email: " + user.getEmail());
            }
            for(User managers : userRepository.findByRole(Role.MANAGER)){
                notificationService.sendNotification(managers.getEmail(),
                        "A new user has been created with email: " + user.getEmail());
            }
        }
        savedUser = userRepository.save(user);

        return savedUser;
    }






}
