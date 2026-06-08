package com.netprobe.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MikrotikConnectionException.class)
    public ResponseEntity<Map<String, String>> handleConnection(MikrotikConnectionException e) {
        log.warn("Erro de conexão MikroTik: {} ({})", e.getMessage(), e.getCode());
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", e.getMessage(), "code", e.getCode()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception e) {
        log.error("Erro inesperado: {}", e.getMessage(), e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Erro interno", "code", "INTERNAL_ERROR"));
    }
}
