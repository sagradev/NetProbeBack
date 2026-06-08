package com.netprobe.dto;

public record PingRequestDTO(String ip, String username, String password, String target, int count) {}
