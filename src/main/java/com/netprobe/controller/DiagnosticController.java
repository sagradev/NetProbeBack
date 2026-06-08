package com.netprobe.controller;

import com.netprobe.dto.*;
import com.netprobe.service.DiagnosticService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/diagnostic")
public class DiagnosticController {

    private final DiagnosticService diagnosticService;

    public DiagnosticController(DiagnosticService diagnosticService) {
        this.diagnosticService = diagnosticService;
    }

    @PostMapping("/ping")
    public ResponseEntity<PingResultDTO> ping(@RequestBody PingRequestDTO req) {
        return ResponseEntity.ok(diagnosticService.ping(req));
    }

    @PostMapping("/traceroute")
    public ResponseEntity<TracerouteResultDTO> traceroute(@RequestBody TracerouteRequestDTO req) {
        return ResponseEntity.ok(diagnosticService.traceroute(req));
    }

    @PostMapping("/bandwidth-test")
    public ResponseEntity<BandwidthTestResultDTO> bandwidthTest(@RequestBody BandwidthTestRequestDTO req) {
        return ResponseEntity.ok(diagnosticService.bandwidthTest(req));
    }
}
