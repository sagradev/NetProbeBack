package com.netprobe.controller;

import com.netprobe.dto.*;
import com.netprobe.service.MikrotikConnectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mikrotik")
public class MikrotikController {

    private final MikrotikConnectionService connectionService;

    public MikrotikController(MikrotikConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    @PostMapping("/connect")
    public ResponseEntity<MikrotikDataDTO> connect(@RequestBody ConnectionRequestDTO req) {
        return ResponseEntity.ok(connectionService.getFullData(req));
    }

    @PostMapping("/resources")
    public ResponseEntity<SystemResourceDTO> resources(@RequestBody ConnectionRequestDTO req) {
        return ResponseEntity.ok(connectionService.getResources(req));
    }

    @PostMapping("/interfaces")
    public ResponseEntity<List<InterfaceDTO>> interfaces(@RequestBody ConnectionRequestDTO req) {
        return ResponseEntity.ok(connectionService.getInterfaces(req));
    }

    @PostMapping("/routes")
    public ResponseEntity<List<RouteDTO>> routes(@RequestBody ConnectionRequestDTO req) {
        return ResponseEntity.ok(connectionService.getRoutes(req));
    }

    @PostMapping("/arp")
    public ResponseEntity<List<ArpEntryDTO>> arp(@RequestBody ConnectionRequestDTO req) {
        return ResponseEntity.ok(connectionService.getArp(req));
    }

    @PostMapping("/dhcp")
    public ResponseEntity<List<DhcpLeaseDTO>> dhcp(@RequestBody ConnectionRequestDTO req) {
        return ResponseEntity.ok(connectionService.getDhcp(req));
    }

    @PostMapping("/logs")
    public ResponseEntity<List<LogEntryDTO>> logs(@RequestBody ConnectionRequestDTO req) {
        return ResponseEntity.ok(connectionService.getLogs(req));
    }
}
