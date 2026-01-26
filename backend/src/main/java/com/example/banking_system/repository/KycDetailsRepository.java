package com.example.banking_system.repository;

import com.example.banking_system.dto.KycDetailsAdminDto;
import com.example.banking_system.entity.KycDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KycDetailsRepository extends JpaRepository<KycDetails, Long> {

    Optional<KycDetails> findByAccountId(Long id);

    Optional<KycDetails> findByAccount_AccountNumber(String accountNumber);

    long deleteByAccount_AccountNumber(String accountNumber);

        @Query("select new com.example.banking_system.dto.KycDetailsAdminDto(" +
            "k.account.accountNumber, k.aadharNumber, k.panNumber, k.address, " +
            "(case when k.kycPdf is not null then true else false end), " +
            "(case when k.aadharDocument is not null then true else false end), " +
            "(case when k.panDocument is not null then true else false end), " +
            "k.uploadedAt) " +
            "from KycDetails k where k.account.accountNumber = :accountNumber")
    Optional<KycDetailsAdminDto> findAdminDtoByAccountNumber(@Param("accountNumber") String accountNumber);

}




