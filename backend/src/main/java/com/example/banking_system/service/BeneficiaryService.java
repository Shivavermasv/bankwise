package com.example.banking_system.service;

import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.Beneficiary;
import com.example.banking_system.entity.User;
import com.example.banking_system.repository.BeneficiaryRepository;
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
    private final CachedDataService cachedDataService;


    public List<Beneficiary> getBeneficiaries(String userEmail) {
        User user = cachedDataService.getUserByEmail(userEmail);
        return beneficiaryRepository.findByUserAndIsActiveTrueOrderByIsFavoriteDescLastUsedAtDesc(user);
    }

    public List<Beneficiary> getFavoriteBeneficiaries(String userEmail) {
        User user = cachedDataService.getUserByEmail(userEmail);
        return beneficiaryRepository.findByUserAndIsFavoriteTrueAndIsActiveTrue(user);
    }

    public List<Beneficiary> searchBeneficiaries(String userEmail, String searchTerm) {
        User user = cachedDataService.getUserByEmail(userEmail);
        return beneficiaryRepository.searchBeneficiaries(user, searchTerm);
    }

    @Transactional
    public Beneficiary addBeneficiary(String userEmail, String beneficiaryAccountNumber, String nickname) {
        User user = cachedDataService.getUserByEmail(userEmail);

        // Check if beneficiary already exists and is active
        if (beneficiaryRepository.existsByUserAndBeneficiaryAccountNumberAndIsActiveTrue(user, beneficiaryAccountNumber)) {
            throw new RuntimeException("Beneficiary already exists");
        }

        // Check if there's a soft-deleted beneficiary that can be reactivated
        Optional<Beneficiary> inactiveBeneficiary = beneficiaryRepository
                .findByUserAndBeneficiaryAccountNumberAndIsActiveFalse(user, beneficiaryAccountNumber);
        if (inactiveBeneficiary.isPresent()) {
            Beneficiary existing = inactiveBeneficiary.get();
            existing.setIsActive(true);
            existing.setNickname(nickname != null && !nickname.trim().isEmpty() ? nickname.trim() : existing.getNickname());
            log.info("Reactivating beneficiary {} for user {}", beneficiaryAccountNumber, userEmail);
            return beneficiaryRepository.save(existing);
        }

        // Validate the account exists - use getAccountByNumberForAuth which eagerly fetches user
        Account beneficiaryAccount;
        try {
            beneficiaryAccount = cachedDataService.getAccountByNumberForAuth(beneficiaryAccountNumber);
        } catch (Exception e) {
            log.warn("Account not found for beneficiary: {}", beneficiaryAccountNumber);
            throw new RuntimeException("Account number not found. Please verify the account number.");
        }

        // Prevent adding self as beneficiary - check if the account belongs to the current user
        if (beneficiaryAccount.getUser() != null && beneficiaryAccount.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You cannot add your own account as a beneficiary");
        }

        // Get the account holder's name (null-safe)
        String beneficiaryName = "Unknown";
        if (beneficiaryAccount.getUser() != null) {
            beneficiaryName = beneficiaryAccount.getUser().getName();
        }

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

    @Transactional
    public Beneficiary updateBeneficiary(String userEmail, Long beneficiaryId, String nickname, Boolean isFavorite) {
        User user = cachedDataService.getUserByEmail(userEmail);

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

    @Transactional
    public void deleteBeneficiary(String userEmail, Long beneficiaryId) {
        User user = cachedDataService.getUserByEmail(userEmail);

        Beneficiary beneficiary = beneficiaryRepository.findById(beneficiaryId)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found"));

        if (!beneficiary.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        beneficiary.setIsActive(false);
        beneficiaryRepository.save(beneficiary);
        log.info("Deactivated beneficiary {} for user {}", beneficiaryId, userEmail);
    }


    @Transactional
    public void recordTransfer(String userEmail, String beneficiaryAccountNumber) {
        User user = cachedDataService.getUserByEmail(userEmail);

        Optional<Beneficiary> beneficiaryOpt = beneficiaryRepository
                .findByUserAndBeneficiaryAccountNumber(user, beneficiaryAccountNumber);

        beneficiaryOpt.ifPresent(b -> {
            b.incrementTransferCount();
            beneficiaryRepository.save(b);
        });
    }

    public Map<String, Object> getBeneficiaryStats(String userEmail) {
        User user = cachedDataService.getUserByEmail(userEmail);

        long total = beneficiaryRepository.countByUser(user);
        List<Beneficiary> favorites = beneficiaryRepository.findByUserAndIsFavoriteTrueAndIsActiveTrue(user);

        return Map.of(
            "totalBeneficiaries", total,
            "favoritesCount", favorites.size()
        );
    }
}
