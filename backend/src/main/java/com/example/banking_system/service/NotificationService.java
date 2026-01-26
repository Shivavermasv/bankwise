package com.example.banking_system.service;

import com.example.banking_system.dto.NotificationResponse;
import com.example.banking_system.entity.Notification;
import com.example.banking_system.repository.NotificationRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    private final UserRepository userRepository;

    private final SimpMessagingTemplate messagingTemplate;

    public void sendNotification(String userEmail, String message) {
        var user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + userEmail));

        var notification = new Notification();
        notification.setMessage(message);
        notification.setSeen(false);
        notification.setTimestamp(LocalDateTime.now());
        notification.setUser(user);

        notificationRepository.save(notification);
        messagingTemplate.convertAndSend("/topic/notifications/" +
                userEmail, mapToNotificationResponse(notification));
        log.info("Notification sent to userEmail={}", userEmail);
    }

    private NotificationResponse mapToNotificationResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .timestamp(notification.getTimestamp())
                .seen(notification.isSeen())
                .build();
    }

    public void markNotificationAsSeen(Long notificationId) {
        var notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.isSeen()) {
            notification.setSeen(true);
            notificationRepository.save(notification);
        }
    }

    public List<NotificationResponse> getNotifications(String userEmail) {
        if (userEmail == null || userEmail.isEmpty()) {
            throw new IllegalArgumentException("User Email cannot be null or empty");
        }
        return notificationRepository.findByUser_EmailAndSeenFalse(userEmail)
                .stream()
                .map(this::mapToNotificationResponse)
                .toList();
    }
}




