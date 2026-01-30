package com.example.banking_system.repository;

import com.example.banking_system.entity.ScheduledPayment;
import com.example.banking_system.entity.User;
import com.example.banking_system.enums.ScheduledPaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ScheduledPaymentRepository extends JpaRepository<ScheduledPayment, Long> {

    @Query("SELECT sp FROM ScheduledPayment sp JOIN FETCH sp.fromAccount WHERE sp.user = ?1 ORDER BY sp.nextExecutionDate ASC")
    List<ScheduledPayment> findByUserOrderByNextExecutionDateAsc(User user);

    @Query("SELECT sp FROM ScheduledPayment sp JOIN FETCH sp.fromAccount WHERE sp.user = ?1 AND sp.status = ?2 ORDER BY sp.nextExecutionDate ASC")
    List<ScheduledPayment> findByUserAndStatusOrderByNextExecutionDateAsc(User user, ScheduledPaymentStatus status);

    @Query("SELECT sp FROM ScheduledPayment sp WHERE sp.status = 'ACTIVE' AND sp.nextExecutionDate <= ?1")
    List<ScheduledPayment> findPaymentsDueForExecution(LocalDate date);

    List<ScheduledPayment> findByUserAndBillerCategoryAndStatus(User user, String billerCategory, ScheduledPaymentStatus status);

    @Query("SELECT sp FROM ScheduledPayment sp WHERE sp.user = ?1 AND sp.status = 'ACTIVE' AND sp.billerName IS NOT NULL")
    List<ScheduledPayment> findActiveBillPaymentsByUser(User user);

    @Query("SELECT sp FROM ScheduledPayment sp WHERE sp.user = ?1 AND sp.status = 'ACTIVE' AND sp.toAccountNumber IS NOT NULL")
    List<ScheduledPayment> findActiveTransfersByUser(User user);

    long countByUserAndStatus(User user, ScheduledPaymentStatus status);

    @Query("SELECT SUM(sp.amount) FROM ScheduledPayment sp WHERE sp.user = ?1 AND sp.status = 'ACTIVE' AND sp.nextExecutionDate BETWEEN ?2 AND ?3")
    java.math.BigDecimal sumUpcomingPayments(User user, LocalDate startDate, LocalDate endDate);
}
