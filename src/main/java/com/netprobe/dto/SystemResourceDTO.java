package com.netprobe.dto;

public record SystemResourceDTO(
        String version,
        String uptime,
        int cpuLoad,
        long totalMemory,
        long freeMemory,
        long totalHdd,
        long freeHdd,
        String identity,
        String platform,
        String boardName
) {}
