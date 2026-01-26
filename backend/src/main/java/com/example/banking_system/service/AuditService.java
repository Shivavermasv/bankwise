package com.example.banking_system.service;

import com.example.banking_system.entity.AuditLog;
import com.example.banking_system.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void record(String action, String targetType, String targetId, String status, String details) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actorEmail = auth != null ? auth.getName() : "SYSTEM";
        String actorRole = auth != null && auth.getAuthorities() != null && !auth.getAuthorities().isEmpty()
                ? auth.getAuthorities().iterator().next().getAuthority()
                : "SYSTEM";
        AuditLog logEntry = AuditLog.builder()
                .action(action)
                .actorEmail(actorEmail)
                .actorRole(actorRole)
                .targetType(targetType)
                .targetId(targetId)
                .status(status)
                .details(details)
                .build();
        auditLogRepository.save(logEntry);
        log.info("AUDIT action={} actor={} targetType={} targetId={} status={} ", action, actorEmail, targetType, targetId, status);
    }

    public void recordSystem(String action, String targetType, String targetId, String status, String details) {
        AuditLog logEntry = AuditLog.builder()
                .action(action)
                .actorEmail("SYSTEM")
                .actorRole("SYSTEM")
                .targetType(targetType)
                .targetId(targetId)
                .status(status)
                .details(details)
                .build();
        auditLogRepository.save(logEntry);
        log.info("AUDIT action={} actor=SYSTEM targetType={} targetId={} status={}", action, targetType, targetId, status);
    }
}




