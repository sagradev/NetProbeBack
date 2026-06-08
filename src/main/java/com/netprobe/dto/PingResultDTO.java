package com.netprobe.dto;

import java.util.List;

public record PingResultDTO(
        List<String> lines,
        int sent,
        int received,
        int loss,
        String avgRtt
) {}
