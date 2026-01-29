package com.example.banking_system.controller;

import com.example.banking_system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notification")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Send a test notification (admin only).
     */
    @GetMapping("/testNotification")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> testNotification(@RequestParam String userEmail) {
        String message = "This is a test notification";
        notificationService.sendNotification(userEmail, message);
        return ResponseEntity.ok("Notification sent successfully");
    }

    /**
     * Get all unseen notifications for the authenticated user.
     */
    @GetMapping("/notifications")
    public ResponseEntity<Object> getNotifications(Authentication auth) {
        String userEmail = auth.getName();
        return ResponseEntity.ok(notificationService.getNotifications(userEmail));
    }

    /**
     * Alternative endpoint using query parameter (backward compatibility).
     * Admin only - regular users should use the authenticated endpoint.
     */
    @GetMapping("/notifications-legacy")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Object> getNotificationsLegacy(@RequestParam String userEmail) {
        return ResponseEntity.ok(notificationService.getNotifications(userEmail));
    }

    /**
     * Mark a specific notification as seen.
     * Uses GET for backward compatibility with frontend.
     */
    @GetMapping("/markNotificationAsSeen")
    public ResponseEntity<Map<String, Object>> markNotificationAsSeenGet(@RequestParam Long notificationId) {
        boolean marked = notificationService.markNotificationAsSeen(notificationId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", marked);
        response.put("message", marked ? "Notification marked as seen" : "Notification was already seen");
        return ResponseEntity.ok(response);
    }

    /**
     * Mark a specific notification as seen (REST-compliant PATCH endpoint).
     * Preferred semantic endpoint.
     */
    @PatchMapping("/notifications/{notificationId}/seen")
    public ResponseEntity<Map<String, Object>> markSeen(@PathVariable Long notificationId) {
        boolean marked = notificationService.markNotificationAsSeen(notificationId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", marked);
        response.put("message", marked ? "Notification marked as seen" : "Notification was already seen");
        return ResponseEntity.ok(response);
    }

    /**
     * Mark all unseen notifications as seen for the authenticated user.
     */
    @PatchMapping("/notifications/mark-all-seen")
    public ResponseEntity<Map<String, Object>> markAllSeen(Authentication auth) {
        String userEmail = auth.getName();
        int count = notificationService.markAllNotificationsAsSeen(userEmail);
        Map<String, Object> response = new HashMap<>();
        response.put("markedCount", count);
        response.put("message", "Marked " + count + " notifications as seen");
        return ResponseEntity.ok(response);
    }

    /**
     * Get all notifications (both seen and unseen) with optional limit.
     */
    @GetMapping("/all")
    public ResponseEntity<Object> getAllNotifications(Authentication auth, 
                                                      @RequestParam(defaultValue = "50") int limit) {
        String userEmail = auth.getName();
        return ResponseEntity.ok(notificationService.getAllNotifications(userEmail, limit));
    }

    /**
     * Delete a specific notification.
     */
    @DeleteMapping("/notifications/{notificationId}")
    public ResponseEntity<Map<String, Object>> deleteNotification(@PathVariable Long notificationId) {
        boolean deleted = notificationService.deleteNotification(notificationId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", deleted);
        response.put("message", deleted ? "Notification deleted" : "Notification not found");
        return ResponseEntity.ok(response);
    }

    /**
     * Get count of unseen notifications for the authenticated user.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(Authentication auth) {
        String userEmail = auth.getName();
        long count = notificationService.getUnseenCount(userEmail);
        Map<String, Object> response = new HashMap<>();
        response.put("unreadCount", count);
        return ResponseEntity.ok(response);
    }
}




