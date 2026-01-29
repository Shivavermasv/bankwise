package com.example.banking_system.repository;

import com.example.banking_system.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;


public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Find all unseen notifications for a user.
     */
    List<Notification> findByUser_EmailAndSeenFalse(String email);

    /**
     * Find all notifications for a user ordered by most recent first.
     */
    List<Notification> findByUser_EmailOrderByTimestampDesc(String email);

    /**
     * Delete all notifications for a user.
     */
    long deleteByUser_Email(String email);

    /**
     * Count all unseen notifications globally.
     */
    long countBySeenFalse();

    /**
     * Count unseen notifications for a specific user.
     */
    long countByUser_EmailAndSeenFalse(String email);

    /**
     * Delete unseen notifications older than a certain timestamp.
     * Useful for cleanup operations.
     */
    @Query("DELETE FROM Notification n WHERE n.seen = true AND n.timestamp < :cutoffTime AND n.user.email = :email")
    int deleteOldNotifications(@Param("email") String email, @Param("cutoffTime") java.time.LocalDateTime cutoffTime);
}




