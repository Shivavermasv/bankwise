package com.example.banking_system.controller;

import com.example.banking_system.service.SupportService;
import com.example.banking_system.dto.SupportTicketRequestDto;
import com.example.banking_system.dto.SupportTicketResponseDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    @PostMapping("/tickets")
    public ResponseEntity<SupportTicketResponseDto> createTicket(@Valid @RequestBody SupportTicketRequestDto request) throws com.example.banking_system.exception.ResourceNotFoundException {
        return ResponseEntity.ok(supportService.createTicket(request));
    }

    @PreAuthorize("hasAnyRole('USER','CUSTOMER')")
    @GetMapping("/tickets/my")
    public ResponseEntity<List<SupportTicketResponseDto>> myTickets() throws com.example.banking_system.exception.ResourceNotFoundException {
        return ResponseEntity.ok(supportService.listForCurrentUser());
    }

    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @GetMapping("/tickets")
    public ResponseEntity<List<SupportTicketResponseDto>> listAll() {
        return ResponseEntity.ok(supportService.listAll());
    }
}




