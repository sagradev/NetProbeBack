package com.netprobe.dto;

public record RouteDTO(
        String dstAddress,
        String gateway,
        String iface,
        boolean active,
        int distance,
        String type
) {}
