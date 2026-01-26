package com.example.banking_system.controller;

import com.example.banking_system.entity.AuditLog;
import com.example.banking_system.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String targetType
    ) {
        if (actorEmail != null && !actorEmail.isBlank()) {
            return ResponseEntity.ok(auditLogRepository.findTop100ByActorEmailOrderByCreatedAtDesc(actorEmail));
        }
        if (action != null && !action.isBlank()) {
            return ResponseEntity.ok(auditLogRepository.findTop100ByActionOrderByCreatedAtDesc(action));
        }
        if (targetType != null && !targetType.isBlank()) {
            return ResponseEntity.ok(auditLogRepository.findTop100ByTargetTypeOrderByCreatedAtDesc(targetType));
        }
        return ResponseEntity.ok(auditLogRepository.findTop100ByOrderByCreatedAtDesc());
    }
}




