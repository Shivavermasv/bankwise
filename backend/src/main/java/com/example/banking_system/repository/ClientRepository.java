package com.example.banking_system.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.banking_system.model.Client;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ClientRepository extends JpaRepository<Client, String> {

    /**
     * Finds clients whose date of birth is after the specified date.
     * @param date The date to compare against.
     * @return List of clients whose date of birth is after the specified date.
     */
    List<Client> findByDateOfBirthAfter(LocalDate date);

    /**
     * Finds clients with the specified phone number.
     * @param phone The phone number to search for.
     * @return List of clients with the specified phone number.
     */
    List<Client> findByPhone(String phone);

    /**
     * Finds clients whose name contains the specified text.
     * @param name The text to search for in the client's name.
     * @return List of clients whose name contains the specified text.
     */
    Optional<Client> findByNameContaining(String name);

    /**
     * Finds clients with the specified email.
     * @param email The email address to search for.
     * @return List of clients with the specified email.
     */
    List<Client> findByEmail(String email);

    /**
     * Finds all clients.
     * @return List of all clients.
     */
    @Query("SELECT c FROM Client c")
    List<Client> findAllClients();
}
