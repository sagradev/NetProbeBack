package com.netprobe.dto;

public record ArpEntryDTO(
        String address,
        String macAddress,
        String iface,
        String status
) {}
