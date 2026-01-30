package com.example.banking_system.repository;

import com.example.banking_system.entity.Beneficiary;
import com.example.banking_system.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiary, Long> {

    List<Beneficiary> findByUserAndIsActiveTrueOrderByIsFavoriteDescLastUsedAtDesc(User user);

    List<Beneficiary> findByUserOrderByTransferCountDesc(User user);

    Optional<Beneficiary> findByUserAndBeneficiaryAccountNumber(User user, String beneficiaryAccountNumber);

    boolean existsByUserAndBeneficiaryAccountNumber(User user, String beneficiaryAccountNumber);

    boolean existsByUserAndBeneficiaryAccountNumberAndIsActiveTrue(User user, String beneficiaryAccountNumber);

    Optional<Beneficiary> findByUserAndBeneficiaryAccountNumberAndIsActiveFalse(User user, String beneficiaryAccountNumber);

    List<Beneficiary> findByUserAndIsFavoriteTrueAndIsActiveTrue(User user);

    @Query("SELECT b FROM Beneficiary b WHERE b.user = ?1 AND b.isActive = true AND " +
           "(LOWER(b.beneficiaryName) LIKE LOWER(CONCAT('%', ?2, '%')) OR " +
           "b.beneficiaryAccountNumber LIKE CONCAT('%', ?2, '%') OR " +
           "LOWER(b.nickname) LIKE LOWER(CONCAT('%', ?2, '%')))")
    List<Beneficiary> searchBeneficiaries(User user, String searchTerm);

    long countByUser(User user);
}
