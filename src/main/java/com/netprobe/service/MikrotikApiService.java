package com.netprobe.service;

import com.netprobe.dto.*;
import com.netprobe.exception.MikrotikConnectionException;
import me.legrange.mikrotik.ApiConnection;
import me.legrange.mikrotik.MikrotikApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.net.SocketFactory;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Coleta dados via RouterOS API proprietária (porta 8728) — compatível com v6 e anteriores.
 */
@Service
public class MikrotikApiService {

    private static final Logger log = LoggerFactory.getLogger(MikrotikApiService.class);
    private static final int DEFAULT_PORT = 8728;
    private static final int LOG_LIMIT = 50;

    @Value("${mikrotik.connection.timeout}")
    private int connectionTimeout;

    // ─── Coleta completa ──────────────────────────────────────────────────────

    public MikrotikDataDTO getFullData(ConnectionRequestDTO req) {
        try (var conn = conectar(req)) {
            return new MikrotikDataDTO(
                    buildResources(conn),
                    buildInterfaces(conn),
                    buildRoutes(conn),
                    buildArp(conn),
                    buildDhcp(conn),
                    buildLogs(conn)
            );
        } catch (MikrotikConnectionException e) {
            throw e;
        } catch (Exception e) {
            throw mapException(e);
        }
    }

    // ─── Endpoints individuais ────────────────────────────────────────────────

    public SystemResourceDTO getResources(ConnectionRequestDTO req) {
        try (var conn = conectar(req)) {
            return buildResources(conn);
        } catch (MikrotikConnectionException e) {
            throw e;
        } catch (Exception e) {
            throw mapException(e);
        }
    }

    public List<InterfaceDTO> getInterfaces(ConnectionRequestDTO req) {
        try (var conn = conectar(req)) {
            return buildInterfaces(conn);
        } catch (MikrotikConnectionException e) {
            throw e;
        } catch (Exception e) {
            throw mapException(e);
        }
    }

    public List<RouteDTO> getRoutes(ConnectionRequestDTO req) {
        try (var conn = conectar(req)) {
            return buildRoutes(conn);
        } catch (MikrotikConnectionException e) {
            throw e;
        } catch (Exception e) {
            throw mapException(e);
        }
    }

    public List<ArpEntryDTO> getArp(ConnectionRequestDTO req) {
        try (var conn = conectar(req)) {
            return buildArp(conn);
        } catch (MikrotikConnectionException e) {
            throw e;
        } catch (Exception e) {
            throw mapException(e);
        }
    }

    public List<DhcpLeaseDTO> getDhcp(ConnectionRequestDTO req) {
        try (var conn = conectar(req)) {
            return buildDhcp(conn);
        } catch (MikrotikConnectionException e) {
            throw e;
        } catch (Exception e) {
            throw mapException(e);
        }
    }

    public List<LogEntryDTO> getLogs(ConnectionRequestDTO req) {
        try (var conn = conectar(req)) {
            return buildLogs(conn);
        } catch (MikrotikConnectionException e) {
            throw e;
        } catch (Exception e) {
            throw mapException(e);
        }
    }

    // ─── Builders internos ────────────────────────────────────────────────────

    private SystemResourceDTO buildResources(ApiConnection conn) throws MikrotikApiException {
        var res = conn.execute("/system/resource/print");
        var ident = conn.execute("/system/identity/print");

        var r = res.isEmpty() ? Map.<String, String>of() : res.get(0);
        var nome = ident.isEmpty() ? "" : ident.get(0).getOrDefault("name", "");

        return new SystemResourceDTO(
                r.getOrDefault("version", ""),
                r.getOrDefault("uptime", ""),
                parseIntField(r, "cpu-load"),
                parseLongField(r, "total-memory"),
                parseLongField(r, "free-memory"),
                parseLongField(r, "total-hdd-space"),
                parseLongField(r, "free-hdd-space"),
                nome,
                r.getOrDefault("platform", ""),
                r.getOrDefault("board-name", "")
        );
    }

    private List<InterfaceDTO> buildInterfaces(ApiConnection conn) throws MikrotikApiException {
        var result = new ArrayList<InterfaceDTO>();
        for (var r : conn.execute("/interface/print")) {
            result.add(new InterfaceDTO(
                    r.getOrDefault("name", ""),
                    r.getOrDefault("type", ""),
                    "true".equals(r.get("running")),
                    r.getOrDefault("mac-address", ""),
                    parseIntField(r, "mtu"),
                    parseLongField(r, "rx-byte"),
                    parseLongField(r, "tx-byte"),
                    parseLongField(r, "rx-error"),
                    parseLongField(r, "tx-error"),
                    "true".equals(r.get("disabled"))
            ));
        }
        return result;
    }

    private List<RouteDTO> buildRoutes(ApiConnection conn) throws MikrotikApiException {
        var result = new ArrayList<RouteDTO>();
        for (var r : conn.execute("/ip/route/print")) {
            result.add(new RouteDTO(
                    r.getOrDefault("dst-address", ""),
                    r.getOrDefault("gateway", ""),
                    r.getOrDefault("interface", ""),
                    "true".equals(r.get("active")),
                    parseIntField(r, "distance"),
                    detectRouteType(r)
            ));
        }
        return result;
    }

    private List<ArpEntryDTO> buildArp(ApiConnection conn) throws MikrotikApiException {
        var result = new ArrayList<ArpEntryDTO>();
        for (var r : conn.execute("/ip/arp/print")) {
            String status = "true".equals(r.get("complete")) ? "complete"
                    : "true".equals(r.get("invalid")) ? "invalid" : "incomplete";
            result.add(new ArpEntryDTO(
                    r.getOrDefault("address", ""),
                    r.getOrDefault("mac-address", ""),
                    r.getOrDefault("interface", ""),
                    status
            ));
        }
        return result;
    }

    private List<DhcpLeaseDTO> buildDhcp(ApiConnection conn) throws MikrotikApiException {
        var result = new ArrayList<DhcpLeaseDTO>();
        for (var r : conn.execute("/ip/dhcp-server/lease/print")) {
            result.add(new DhcpLeaseDTO(
                    r.getOrDefault("address", ""),
                    r.getOrDefault("mac-address", ""),
                    r.getOrDefault("host-name", ""),
                    r.getOrDefault("status", ""),
                    r.getOrDefault("expires-after", "")
            ));
        }
        return result;
    }

    private List<LogEntryDTO> buildLogs(ApiConnection conn) throws MikrotikApiException {
        var all = conn.execute("/log/print");
        var slice = all.size() > LOG_LIMIT ? all.subList(all.size() - LOG_LIMIT, all.size()) : all;
        var result = new ArrayList<LogEntryDTO>();
        for (var r : slice) {
            result.add(new LogEntryDTO(
                    r.getOrDefault("time", ""),
                    r.getOrDefault("topics", ""),
                    r.getOrDefault("message", "")
            ));
        }
        return result;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    ApiConnection conectar(ConnectionRequestDTO req) {
        try {
            int port = (req.port() != null && req.port() > 0) ? req.port() : DEFAULT_PORT;
            log.debug("Conectando em {}:{} (RouterOS API)", req.ip(), port);
            var conn = ApiConnection.connect(SocketFactory.getDefault(), req.ip(), port, connectionTimeout);
            conn.login(req.username(), req.password());
            return conn;
        } catch (Exception e) {
            throw mapException(e);
        }
    }

    private String detectRouteType(Map<String, String> r) {
        if ("true".equals(r.get("ospf"))) return "ospf";
        if ("true".equals(r.get("bgp"))) return "bgp";
        if ("true".equals(r.get("rip"))) return "rip";
        if ("true".equals(r.get("static"))) return "static";
        if ("true".equals(r.get("connected"))) return "connected";
        if ("true".equals(r.get("dynamic"))) return "dynamic";
        return "unknown";
    }

    private int parseIntField(Map<String, String> m, String key) {
        try {
            var raw = m.getOrDefault(key, "0").replaceAll("[^0-9]", "").strip();
            return raw.isEmpty() ? 0 : Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private long parseLongField(Map<String, String> m, String key) {
        try {
            var raw = m.getOrDefault(key, "0").replaceAll("[^0-9]", "").strip();
            return raw.isEmpty() ? 0L : Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    MikrotikConnectionException mapException(Exception e) {
        var msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
        if (msg.contains("timed out") || msg.contains("connection refused") || msg.contains("no route")
                || msg.contains("unreachable") || msg.contains("connect")) {
            return new MikrotikConnectionException("Host inacessível", "TIMEOUT");
        }
        if (msg.contains("cannot log in") || msg.contains("invalid user") || msg.contains("bad password")
                || msg.contains("login") || msg.contains("auth")) {
            return new MikrotikConnectionException("Autenticação falhou", "AUTH_ERROR");
        }
        if (msg.contains("api service") || msg.contains("service disabled")) {
            return new MikrotikConnectionException("Serviço API desabilitado no dispositivo", "API_DISABLED");
        }
        return new MikrotikConnectionException("Erro de conexão: " + e.getMessage(), "CONNECTION_ERROR");
    }
}
