package com.example.banking_system.repository;

import com.example.banking_system.entity.Card;
import com.example.banking_system.entity.User;
import com.example.banking_system.entity.Account;
import com.example.banking_system.enums.CardType;
import com.example.banking_system.enums.CardStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {

    List<Card> findByUserOrderByCreatedAtDesc(User user);

    List<Card> findByUserAndStatusOrderByCreatedAtDesc(User user, CardStatus status);

    Optional<Card> findByCardNumber(String cardNumber);

    Optional<Card> findByUserAndCardType(User user, CardType cardType);

    Optional<Card> findByAccountAndCardType(Account account, CardType cardType);

    boolean existsByUserAndCardType(User user, CardType cardType);

    boolean existsByCardNumber(String cardNumber);

    List<Card> findByExpiryDateBeforeAndStatus(LocalDate date, CardStatus status);

    @Query("SELECT c FROM Card c WHERE c.user = ?1 AND c.status = 'ACTIVE'")
    List<Card> findActiveCardsByUser(User user);

    long countByUserAndStatus(User user, CardStatus status);
}
