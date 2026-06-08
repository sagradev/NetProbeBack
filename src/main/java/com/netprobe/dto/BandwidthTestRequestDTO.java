package com.netprobe.dto;

public record BandwidthTestRequestDTO(
        String ip,
        String username,
        String password,
        String target,
        String direction,
        int duration
) {}
