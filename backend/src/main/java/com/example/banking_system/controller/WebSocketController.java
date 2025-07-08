package com.example.banking_system.controller;

import com.example.banking_system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WebSocketController {
    private final NotificationService notificationService;

    @MessageMapping("/notifications/seen")
    public void markAsSeen(Long notificationId) {
        notificationService.markNotificationAsSeen(notificationId);
    }
}
