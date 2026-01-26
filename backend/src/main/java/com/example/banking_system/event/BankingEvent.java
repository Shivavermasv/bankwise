package com.example.banking_system.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Base event class for all banking events.
 * Events allow decoupling of operations - the API responds immediately
 * while background processing happens asynchronously.
 */
@Getter
public abstract class BankingEvent extends ApplicationEvent {
    
    private final String eventType;
    private final String targetId;
    private final long eventTime;

    public BankingEvent(Object source, String eventType, String targetId) {
        super(source);
        this.eventType = eventType;
        this.targetId = targetId;
        this.eventTime = System.currentTimeMillis();
    }
}




