package com.example.banking_system;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BankingSystemApplicationTests {

	@MockBean
	private SimpMessagingTemplate messagingTemplate;

	@Test
	void contextLoads() {
	}

}
