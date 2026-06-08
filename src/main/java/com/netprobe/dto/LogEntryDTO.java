package com.netprobe.dto;

public record LogEntryDTO(
        String time,
        String topics,
        String message
) {}
