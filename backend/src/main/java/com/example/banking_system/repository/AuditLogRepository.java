package com.example.banking_system.repository;

import com.example.banking_system.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop100ByOrderByCreatedAtDesc();
    List<AuditLog> findTop100ByActorEmailOrderByCreatedAtDesc(String actorEmail);
    List<AuditLog> findTop100ByActionOrderByCreatedAtDesc(String action);
    List<AuditLog> findTop100ByTargetTypeOrderByCreatedAtDesc(String targetType);

    long deleteByTargetTypeAndTargetId(String targetType, String targetId);
}




