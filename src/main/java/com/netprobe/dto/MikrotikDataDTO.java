package com.netprobe.dto;

import java.util.List;

public record MikrotikDataDTO(
        SystemResourceDTO resources,
        List<InterfaceDTO> interfaces,
        List<RouteDTO> routes,
        List<ArpEntryDTO> arpEntries,
        List<DhcpLeaseDTO> dhcpLeases,
        List<LogEntryDTO> logs
) {}
