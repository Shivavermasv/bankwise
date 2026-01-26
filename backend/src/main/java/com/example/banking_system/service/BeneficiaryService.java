package com.example.banking_system.service;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.Beneficiary;
import com.example.banking_system.entity.User;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.BeneficiaryRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    /**
     * Get all beneficiaries for a user
     */
    public List<Beneficiary> getBeneficiaries(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return beneficiaryRepository.findByUserAndIsActiveTrueOrderByIsFavoriteDescLastUsedAtDesc(user);
    }

    /**
     * Get favorite beneficiaries
     */
    public List<Beneficiary> getFavoriteBeneficiaries(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return beneficiaryRepository.findByUserAndIsFavoriteTrueAndIsActiveTrue(user);
    }

    /**
     * Search beneficiaries
     */
    public List<Beneficiary> searchBeneficiaries(String userEmail, String searchTerm) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return beneficiaryRepository.searchBeneficiaries(user, searchTerm);
    }

    /**
     * Add a new beneficiary
     */
    @Transactional
    public Beneficiary addBeneficiary(String userEmail, String beneficiaryAccountNumber, String nickname) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if beneficiary already exists
        if (beneficiaryRepository.existsByUserAndBeneficiaryAccountNumber(user, beneficiaryAccountNumber)) {
            throw new RuntimeException("Beneficiary already exists");
        }

        // Validate the account exists
        Account beneficiaryAccount = accountRepository.findByAccountNumber(beneficiaryAccountNumber)
                .orElseThrow(() -> new RuntimeException("Beneficiary account not found"));

        // Get the account holder's name
        String beneficiaryName = beneficiaryAccount.getUser().getName();

        Beneficiary beneficiary = Beneficiary.builder()
                .user(user)
                .beneficiaryAccountNumber(beneficiaryAccountNumber)
                .beneficiaryName(beneficiaryName)
                .nickname(nickname != null && !nickname.trim().isEmpty() ? nickname.trim() : null)
                .bankName("BankWise")
                .isActive(true)
                .isFavorite(false)
                .build();

        log.info("Adding beneficiary {} for user {}", beneficiaryAccountNumber, userEmail);
        return beneficiaryRepository.save(beneficiary);
    }

    /**
     * Update beneficiary
     */
    @Transactional
    public Beneficiary updateBeneficiary(String userEmail, Long beneficiaryId, String nickname, Boolean isFavorite) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Beneficiary beneficiary = beneficiaryRepository.findById(beneficiaryId)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));

        if (!beneficiary.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        if (nickname != null) {
            beneficiary.setNickname(nickname.trim().isEmpty() ? null : nickname.trim());
        }
        if (isFavorite != null) {
            beneficiary.setIsFavorite(isFavorite);
        }

        return beneficiaryRepository.save(beneficiary);
    }

    /**
     * Delete (deactivate) beneficiary
     */
    @Transactional
    public void deleteBeneficiary(String userEmail, Long beneficiaryId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Beneficiary beneficiary = beneficiaryRepository.findById(beneficiaryId)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));

        if (!beneficiary.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        beneficiary.setIsActive(false);
        beneficiaryRepository.save(beneficiary);
        log.info("Deactivated beneficiary {} for user {}", beneficiaryId, userEmail);
    }

    /**
     * Record a transfer to a beneficiary (updates last used and count)
     */
    @Transactional
    public void recordTransfer(String userEmail, String beneficiaryAccountNumber) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<Beneficiary> beneficiaryOpt = beneficiaryRepository
                .findByUserAndBeneficiaryAccountNumber(user, beneficiaryAccountNumber);

        beneficiaryOpt.ifPresent(b -> {
            b.incrementTransferCount();
            beneficiaryRepository.save(b);
        });
    }

    /**
     * Get beneficiary stats
     */
    public Map<String, Object> getBeneficiaryStats(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        long total = beneficiaryRepository.countByUser(user);
        List<Beneficiary> favorites = beneficiaryRepository.findByUserAndIsFavoriteTrueAndIsActiveTrue(user);

        return Map.of(
            "totalBeneficiaries", total,
            "favoritesCount", favorites.size()
        );
    }
}
