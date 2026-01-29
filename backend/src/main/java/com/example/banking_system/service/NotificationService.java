package com.example.banking_system.service;

import com.example.banking_system.dto.NotificationResponse;
import com.example.banking_system.entity.Notification;
import com.example.banking_system.repository.NotificationRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void sendNotification(String userEmail, String message) {
        var user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        var notification = new Notification();
        notification.setMessage(message);
        notification.setSeen(false);
        notification.setTimestamp(LocalDateTime.now());
        notification.setUser(user);

        // Flush to ensure DB consistency before sending WebSocket message
        var savedNotification = notificationRepository.save(notification);
        notificationRepository.flush(); // Force immediate flush to database
        
        try {
            messagingTemplate.convertAndSend("/topic/notifications/" + userEmail, 
                    mapToNotificationResponse(savedNotification));
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification to {}: {}", userEmail, e.getMessage());
            // Continue anyway - notification is saved in DB
        }
        
        log.info("Notification sent and persisted to userEmail={}", userEmail);
    }

    private NotificationResponse mapToNotificationResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .timestamp(notification.getTimestamp())
                .seen(notification.isSeen())
                .build();
    }

    /**
     * Mark a single notification as seen.
     * Uses optimistic locking to prevent concurrent update issues.
     * @param notificationId The notification ID to mark as seen
     * @return true if successfully marked, false if already seen or not found
     */
    @Transactional
    public boolean markNotificationAsSeen(Long notificationId) {
        log.debug("Marking notification as seen: {}", notificationId);
        
        var notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found with id: " + notificationId));
        
        if (!notification.isSeen()) {
            notification.setSeen(true);
            notificationRepository.save(notification);
            notificationRepository.flush(); // Ensure immediate DB persistence
            log.info("Notification {} successfully marked as seen", notificationId);
            return true;
        }
        
        log.debug("Notification {} was already seen", notificationId);
        return false;
    }

    /**
     * Mark all unseen notifications for a user as seen.
     * Useful for bulk operations like opening notification drawer.
     * @param userEmail The user's email
     * @return Number of notifications marked as seen
     */
    @Transactional
    public int markAllNotificationsAsSeen(String userEmail) {
        if (userEmail == null || userEmail.isEmpty()) {
            throw new IllegalArgumentException("User Email cannot be null or empty");
        }
        
        List<Notification> unseenNotifications = notificationRepository.findByUser_EmailAndSeenFalse(userEmail);
        int count = unseenNotifications.size();
        
        for (Notification notification : unseenNotifications) {
            notification.setSeen(true);
        }
        
        notificationRepository.saveAll(unseenNotifications);
        notificationRepository.flush(); // Force immediate flush for all
        
        log.info("Marked {} notifications as seen for user: {}", count, userEmail);
        return count;
    }

    /**
     * Get all unseen notifications for a user.
     * @param userEmail The user's email
     * @return List of unseen notifications
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String userEmail) {
        if (userEmail == null || userEmail.isEmpty()) {
            throw new IllegalArgumentException("User Email cannot be null or empty");
        }
        
        return notificationRepository.findByUser_EmailAndSeenFalse(userEmail)
                .stream()
                .map(this::mapToNotificationResponse)
                .toList();
    }

    /**
     * Get all notifications (both seen and unseen) for a user.
     * Paginated for performance.
     * @param userEmail The user's email
     * @param limit Maximum number to return
     * @return List of all notifications
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getAllNotifications(String userEmail, int limit) {
        if (userEmail == null || userEmail.isEmpty()) {
            throw new IllegalArgumentException("User Email cannot be null or empty");
        }
        
        return notificationRepository.findByUser_EmailOrderByTimestampDesc(userEmail)
                .stream()
                .limit(limit)
                .map(this::mapToNotificationResponse)
                .toList();
    }

    /**
     * Delete a specific notification.
     * @param notificationId The notification ID to delete
     * @return true if deleted, false if not found
     */
    @Transactional
    public boolean deleteNotification(Long notificationId) {
        if (notificationRepository.existsById(notificationId)) {
            notificationRepository.deleteById(notificationId);
            notificationRepository.flush();
            log.info("Notification {} deleted", notificationId);
            return true;
        }
        return false;
    }

    /**
     * Get count of unseen notifications for a user.
     * @param userEmail The user's email
     * @return Count of unseen notifications
     */
    @Transactional(readOnly = true)
    public long getUnseenCount(String userEmail) {
        if (userEmail == null || userEmail.isEmpty()) {
            return 0;
        }
        return notificationRepository.countByUser_EmailAndSeenFalse(userEmail);
    }
}




