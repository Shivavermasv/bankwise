package com.example.banking_system.repository;

import com.example.banking_system.entity.User;
import com.example.banking_system.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    /**
     * Finds Users whose date of birth is after the specified date.
     * @param date The date to compare against.
     * @return List of Users whose date of birth is after the specified date.
     */
    List<User> findByDateOfBirthAfter(LocalDate date);

    /**
     * Finds Users with the specified phone number.
     * @param phone The phone number to search for.
     * @return List of Users with the specified phone number.
     */
    List<User> findByPhone(String phone);

    /**
     * Finds Users whose name contains the specified text.
     * @param name The text to search for in the User's name.
     * @return List of Users whose name contains the specified text.
     */
    Optional<User> findByNameContaining(String name);

    /**
     * Finds Users with the specified email.
     * @param email The email address to search for.
     * @return List of Users with the specified email.
     */
    Optional<User> findByEmail(String email);

    List<User> findByRole(Role role);

    /**
     * Finds all Users.
     * @return List of all Users.
     */
    @Query("SELECT c FROM users c")
    List<User> findAllUsers();
}
