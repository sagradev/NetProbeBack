package com.netprobe.service;

import com.netprobe.dto.*;
import me.legrange.mikrotik.MikrotikApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Executa ferramentas de diagnóstico ativo (ping, traceroute, bandwidth-test)
 * via RouterOS API — funciona em v6 e v7.
 */
@Service
public class DiagnosticService {

    private static final Logger log = LoggerFactory.getLogger(DiagnosticService.class);

    private final MikrotikApiService apiService;

    public DiagnosticService(MikrotikApiService apiService) {
        this.apiService = apiService;
    }

    // ─── Ping ─────────────────────────────────────────────────────────────────

    public PingResultDTO ping(PingRequestDTO req) {
        var connReq = new ConnectionRequestDTO(req.ip(), req.username(), req.password());
        try (var api = apiService.conectar(connReq)) {
            int count = req.count() > 0 ? req.count() : 4;
            var results = api.execute("/tool/ping address=" + req.target() + " count=" + count);
            return parsePing(results);
        } catch (MikrotikApiException e) {
            throw apiService.mapException(e);
        } catch (Exception e) {
            throw apiService.mapException(e);
        }
    }

    // ─── Traceroute ───────────────────────────────────────────────────────────

    public TracerouteResultDTO traceroute(TracerouteRequestDTO req) {
        var connReq = new ConnectionRequestDTO(req.ip(), req.username(), req.password());
        try (var api = apiService.conectar(connReq)) {
            var results = api.execute("/tool/traceroute address=" + req.target() + " count=1");
            return parseTraceroute(results);
        } catch (MikrotikApiException e) {
            throw apiService.mapException(e);
        } catch (Exception e) {
            throw apiService.mapException(e);
        }
    }

    // ─── Bandwidth Test ───────────────────────────────────────────────────────

    public BandwidthTestResultDTO bandwidthTest(BandwidthTestRequestDTO req) {
        var connReq = new ConnectionRequestDTO(req.ip(), req.username(), req.password());
        try (var api = apiService.conectar(connReq)) {
            int duration = req.duration() > 0 ? req.duration() : 10;
            api.setTimeout((duration + 15) * 1000);
            var results = api.execute(
                    "/tool/bandwidth-test address=" + req.target()
                    + " direction=" + req.direction()
                    + " duration=" + duration
            );
            return parseBandwidth(results);
        } catch (MikrotikApiException e) {
            throw apiService.mapException(e);
        } catch (Exception e) {
            throw apiService.mapException(e);
        }
    }

    // ─── Parsers ──────────────────────────────────────────────────────────────

    private PingResultDTO parsePing(List<Map<String, String>> results) {
        var lines = new ArrayList<String>();
        int sent = 0, received = 0;
        String avgRtt = "N/A";

        for (var r : results) {
            if (r.containsKey("sent")) {
                sent = parseIntField(r, "sent");
                received = parseIntField(r, "received");
                avgRtt = r.getOrDefault("avg-rtt", "N/A");
                int loss = sent > 0 ? (sent - received) * 100 / sent : 0;
                lines.add(String.format("--- Enviados: %d  Recebidos: %d  Perdidos: %d%%  RTT médio: %s",
                        sent, received, loss, avgRtt));
            } else if (r.containsKey("seq")) {
                lines.add(String.format("seq=%s  host=%s  time=%s  (%s)",
                        r.getOrDefault("seq", "?"),
                        r.getOrDefault("host", r.getOrDefault("address", "?")),
                        r.getOrDefault("time", "?"),
                        r.getOrDefault("status", "?")));
            }
        }

        int loss = sent > 0 ? (sent - received) * 100 / sent : 0;
        return new PingResultDTO(lines, sent, received, loss, avgRtt);
    }

    private TracerouteResultDTO parseTraceroute(List<Map<String, String>> results) {
        var hops = new ArrayList<TracerouteResultDTO.TracerouteHop>();
        for (var r : results) {
            if (r.containsKey("hop")) {
                hops.add(new TracerouteResultDTO.TracerouteHop(
                        parseIntField(r, "hop"),
                        r.getOrDefault("address", "***"),
                        r.getOrDefault("time", "***"),
                        r.getOrDefault("status", "")
                ));
            }
        }
        return new TracerouteResultDTO(hops);
    }

    private BandwidthTestResultDTO parseBandwidth(List<Map<String, String>> results) {
        if (results.isEmpty()) {
            return new BandwidthTestResultDTO("0 bps", "0 bps", "0", "0");
        }
        var last = results.get(results.size() - 1);
        return new BandwidthTestResultDTO(
                formatBps(last.getOrDefault("tx-current", "0")),
                formatBps(last.getOrDefault("rx-current", "0")),
                last.getOrDefault("lost-packets", "0"),
                last.getOrDefault("duration", "0")
        );
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private int parseIntField(Map<String, String> m, String key) {
        try {
            var raw = m.getOrDefault(key, "0").replaceAll("[^0-9]", "").strip();
            return raw.isEmpty() ? 0 : Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String formatBps(String rawBps) {
        try {
            long bps = Long.parseLong(rawBps.replaceAll("[^0-9]", "").strip());
            if (bps >= 1_000_000) return String.format("%.2f Mbps", bps / 1_000_000.0);
            if (bps >= 1_000) return String.format("%.2f Kbps", bps / 1_000.0);
            return bps + " bps";
        } catch (NumberFormatException e) {
            return rawBps;
        }
    }
}
