package com.netprobe.dto;

public record DhcpLeaseDTO(
        String address,
        String macAddress,
        String hostname,
        String status,
        String expiresAfter
) {}
