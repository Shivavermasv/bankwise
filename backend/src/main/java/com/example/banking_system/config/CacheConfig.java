package com.example.banking_system.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {

        // Proper ObjectMapper for Java time (LocalDateTime etc.)
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        GenericJackson2JsonRedisSerializer serializer =
                new GenericJackson2JsonRedisSerializer(objectMapper);

        RedisCacheConfiguration defaultConfig =
                RedisCacheConfiguration.defaultCacheConfig()
                        .disableCachingNullValues()
                        .serializeValuesWith(
                                RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                        )
                        .serializeKeysWith(
                                RedisSerializationContext.SerializationPair.fromSerializer(
                                        org.springframework.data.redis.serializer.StringRedisSerializer.UTF_8
                                )
                        )
                        .prefixCacheNameWith("bankwise::")
                        .entryTtl(Duration.ofMinutes(10)); // sane default TTL

        Map<String, RedisCacheConfiguration> configs = new HashMap<>();

        configs.put("userAnalytics", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        configs.put("adminDashboard", defaultConfig.entryTtl(Duration.ofMinutes(2)));
        configs.put("accountListForAdmin", defaultConfig.entryTtl(Duration.ofMinutes(1)));
        configs.put("depositRequestList", defaultConfig.entryTtl(Duration.ofMinutes(2)));
        configs.put("userByEmail", defaultConfig.entryTtl(Duration.ofMinutes(15)));
        configs.put("accountByNumber", defaultConfig.entryTtl(Duration.ofMinutes(10)));
        configs.put("accountBalances", defaultConfig.entryTtl(Duration.ofSeconds(30)));

        return RedisCacheManager.builder(factory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(configs)
                .transactionAware() // important for @Transactional methods
                .build();
    }
}
