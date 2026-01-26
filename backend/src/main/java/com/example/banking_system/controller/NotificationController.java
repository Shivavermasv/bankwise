package com.example.banking_system.controller;

import com.example.banking_system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/testNotification")
    public ResponseEntity<String> testNotification(@RequestParam String userEmail) {
        String message = "This is a test notification";
        notificationService.sendNotification(userEmail, message);
        return ResponseEntity.ok("Notification sent successfully");
    }

    @GetMapping("/notifications")
    public ResponseEntity<Object> getNotifications(@RequestParam String userEmail) {
        return ResponseEntity.ok(notificationService.getNotifications(userEmail));
    }

    @GetMapping("/markNotificationAsSeen")
    public ResponseEntity<Object> markNotificationAsSeen(@RequestParam Long notificationId) {
        notificationService.markNotificationAsSeen(notificationId);
        return ResponseEntity.ok("Notification marked as seen");
    }

    // Preferred semantic endpoint; keep the old GET for backward compatibility with the current frontend.
    @PatchMapping("/notifications/{notificationId}/seen")
    public ResponseEntity<Object> markSeen(@org.springframework.web.bind.annotation.PathVariable Long notificationId) {
        notificationService.markNotificationAsSeen(notificationId);
        return ResponseEntity.ok("Notification marked as seen");
    }
}




