package com.netprobe.dto;

public record BandwidthTestResultDTO(
        String txAverage,
        String rxAverage,
        String lostPackets,
        String duration
) {}
