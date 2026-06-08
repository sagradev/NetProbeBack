package com.netprobe.dto;

public record PingRequestDTO(String ip, String username, String password, Integer port, String target, int count) {}
