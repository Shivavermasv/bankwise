package com.example.banking_system.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
@Slf4j
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory factory) {

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // 🔑 CRITICAL: enable type metadata for polymorphic types
        objectMapper.activateDefaultTyping(
                objectMapper.getPolymorphicTypeValidator(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        GenericJackson2JsonRedisSerializer serializer =
                new GenericJackson2JsonRedisSerializer(objectMapper);

        RedisCacheConfiguration defaultConfig =
                RedisCacheConfiguration.defaultCacheConfig()
                        .disableCachingNullValues()
                        .serializeKeysWith(
                                RedisSerializationContext.SerializationPair.fromSerializer(
                                        StringRedisSerializer.UTF_8
                                )
                        )
                        .serializeValuesWith(
                                RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                        )
                        .prefixCacheNameWith("bankwise::")
                        .entryTtl(Duration.ofMinutes(10));

        Map<String, RedisCacheConfiguration> configs = new HashMap<>();

        // Granular cache TTL configuration for different data types
        configs.put("userAnalytics", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        configs.put("adminDashboard", defaultConfig.entryTtl(Duration.ofMinutes(2)));
        configs.put("accountListForAdmin", defaultConfig.entryTtl(Duration.ofMinutes(1)));
        configs.put("depositRequestList", defaultConfig.entryTtl(Duration.ofMinutes(2)));
        configs.put("userByEmail", defaultConfig.entryTtl(Duration.ofMinutes(15)));
        configs.put("accountByNumber", defaultConfig.entryTtl(Duration.ofMinutes(10)));
        configs.put("accountBalances", defaultConfig.entryTtl(Duration.ofSeconds(30)));
        configs.put("idempotency", defaultConfig.entryTtl(Duration.ofHours(24)));

        try {
            return RedisCacheManager.builder(factory)
                    .cacheDefaults(defaultConfig)
                    .withInitialCacheConfigurations(configs)
                    .transactionAware()
                    .build();
        } catch (Exception e) {
            log.error("Failed to initialize Redis cache manager, falling back to no-op cache", e);
            throw new RuntimeException("Redis cache manager initialization failed", e);
        }
    }

    /**
     * RedisTemplate for manual cache operations (idempotency, custom eviction).
     * Uses String serialization for keys and JSON for values.
     */
    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        StringRedisSerializer stringSerializer = StringRedisSerializer.UTF_8;
        template.setKeySerializer(stringSerializer);
        template.setValueSerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setHashValueSerializer(stringSerializer);

        template.afterPropertiesSet();
        return template;
    }

    /**
     * Generic RedisTemplate for object operations.
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplateObject(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        StringRedisSerializer stringSerializer = StringRedisSerializer.UTF_8;
        GenericJackson2JsonRedisSerializer jackson2JsonRedisSerializer = new GenericJackson2JsonRedisSerializer();

        template.setKeySerializer(stringSerializer);
        template.setValueSerializer(jackson2JsonRedisSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setHashValueSerializer(jackson2JsonRedisSerializer);

        template.afterPropertiesSet();
        return template;
    }
}
