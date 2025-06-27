package com.example.banking_system.repository;

import com.example.banking_system.entity.KycDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KycDetailsRepository extends JpaRepository<KycDetails, Long> {

    Optional<KycDetails> findByAccountId(Long id);

}
