package com.netprobe.dto;

public record BandwidthTestRequestDTO(
        String ip,
        String username,
        String password,
        Integer port,
        String target,
        String direction,
        int duration
) {}
