package com.netprobe.dto;

public record InterfaceDTO(
        String name,
        String type,
        boolean running,
        String macAddress,
        int mtu,
        long rxBytes,
        long txBytes,
        long rxErrors,
        long txErrors,
        boolean disabled
) {}
