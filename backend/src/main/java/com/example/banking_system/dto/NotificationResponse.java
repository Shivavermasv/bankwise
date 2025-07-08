package com.example.banking_system.dto;


import lombok.*;

import java.time.LocalDateTime;

@Builder
@Getter
@Setter
@Data
@AllArgsConstructor
@NoArgsConstructor
public class NotificationResponse {
    private Long id;
    private String message;
    private LocalDateTime timestamp;
    private boolean seen;
}
