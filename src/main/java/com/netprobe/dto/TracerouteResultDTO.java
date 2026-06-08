package com.netprobe.dto;

import java.util.List;

public record TracerouteResultDTO(List<TracerouteHop> hops) {

    public record TracerouteHop(int hop, String address, String time, String status) {}
}
