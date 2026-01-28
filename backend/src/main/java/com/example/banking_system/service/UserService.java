package com.example.banking_system.service;

import com.example.banking_system.dto.CreateRequestDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.AccountType;
import com.example.banking_system.enums.Role;
import com.example.banking_system.exception.BusinessRuleViolationException;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Base64;


@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final NotificationService notificationService;

    private final UserRepository userRepository;

    private final AccountRepository accountRepository;

    private final PasswordEncoder passwordEncoder;

    private final AuditService auditService;

    @Value("${bankwise.admin.registration-code:4321}")
    private String adminRegistrationCode;

    private static final long MAX_PROFILE_PHOTO_SIZE = 500 * 1024; // 500KB

    private static final long OTP_SESSION_TTL = 10 * 60;


    public User getUser(String userName){
        return userRepository.findByEmail(userName).orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + userName));
    }

    @Transactional
    public Object createUser(CreateRequestDto createRequestDto) {
        log.info("Creating user with email={} role={}", createRequestDto.getEmail(), createRequestDto.getRole());

        // Validate admin registration code
        if (Role.ADMIN.equals(createRequestDto.getRole())) {
            if (createRequestDto.getAdminCode() == null || !adminRegistrationCode.equals(createRequestDto.getAdminCode())) {
                throw new BusinessRuleViolationException("Invalid admin registration code");
            }
        }

        User user = User.builder()
                .role(createRequestDto.getRole())
                .address(createRequestDto.getAddress())
                .phone(createRequestDto.getPhoneNumber())
                .email(createRequestDto.getEmail())
                .dateOfBirth(createRequestDto.getDateOfBirth())
                .name(createRequestDto.getUserName())
                .password(createRequestDto.getPassword())
                .build();

        // Handle profile photo (optional)
        if (createRequestDto.getProfilePhoto() != null && !createRequestDto.getProfilePhoto().isEmpty()) {
            try {
                byte[] photoBytes = Base64.getDecoder().decode(createRequestDto.getProfilePhoto());
                if (photoBytes.length > MAX_PROFILE_PHOTO_SIZE) {
                    throw new BusinessRuleViolationException("Profile photo must be less than 500KB");
                }
                user.setProfilePhoto(photoBytes);
                user.setProfilePhotoContentType(createRequestDto.getProfilePhotoContentType());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid base64 profile photo for user={}", createRequestDto.getEmail());
            }
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser;
        if (Role.USER.equals(user.getRole()) || Role.CUSTOMER.equals(user.getRole())) {
            if (createRequestDto.getAccountType() == null || createRequestDto.getAccountType().isBlank()) {
                throw new IllegalArgumentException("Account type is required");
            }
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
        log.info("User created with id={} email={}", savedUser.getId(), savedUser.getEmail());
        auditService.recordSystem("USER_CREATE", "USER", String.valueOf(savedUser.getId()), "SUCCESS",
            "email=" + savedUser.getEmail() + " role=" + savedUser.getRole());

        return savedUser;
    }

}




