package com.example.banking_system.service;

import com.example.banking_system.dto.SupportTicketRequestDto;
import com.example.banking_system.dto.SupportTicketResponseDto;
import com.example.banking_system.entity.Account;
import com.example.banking_system.entity.SupportTicket;
import com.example.banking_system.entity.User;
import com.example.banking_system.exception.ResourceNotFoundException;
import com.example.banking_system.repository.AccountRepository;
import com.example.banking_system.repository.SupportTicketRepository;
import com.example.banking_system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupportService {

    private final SupportTicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;

    public SupportTicketResponseDto createTicket(SupportTicketRequestDto request) throws ResourceNotFoundException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;
        if (email == null) {
            throw new ResourceNotFoundException("User not found");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Account account = accountRepository.findAccountByUser(user).orElse(null);

        SupportTicket ticket = new SupportTicket();
        ticket.setUserEmail(user.getEmail());
        ticket.setUserName(user.getName());
        ticket.setAccountNumber(account != null ? account.getAccountNumber() : null);
        ticket.setCategory(request.getCategory());
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getDescription());
        ticket.setPriority(request.getPriority());
        ticket.setStatus("OPEN");

        SupportTicket saved = ticketRepository.save(ticket);
        return toResponse(saved);
    }

    public List<SupportTicketResponseDto> listAll() {
        return ticketRepository.findAll().stream().map(this::toResponse).toList();
    }

    public List<SupportTicketResponseDto> listForCurrentUser() throws ResourceNotFoundException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;
        if (email == null) {
            throw new ResourceNotFoundException("User not found");
        }
        // Exclude RESOLVED and CLOSED tickets from user view (handled by developer)
        return ticketRepository.findByUserEmailAndStatusNotInOrderByCreatedAtDesc(
                email, 
                List.of("RESOLVED", "CLOSED")
        )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private SupportTicketResponseDto toResponse(SupportTicket ticket) {
        return new SupportTicketResponseDto(
                ticket.getId(),
                ticket.getUserEmail(),
                ticket.getUserName(),
                ticket.getAccountNumber(),
                ticket.getCategory(),
                ticket.getSubject(),
                ticket.getDescription(),
                ticket.getPriority(),
                ticket.getStatus(),
                ticket.getCreatedAt()
        );
    }
}




