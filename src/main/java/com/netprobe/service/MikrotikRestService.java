package com.netprobe.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.netprobe.dto.*;
import com.netprobe.exception.MikrotikConnectionException;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Coleta dados via REST API do RouterOS (v7+) na porta 80.
 */
@Service
public class MikrotikRestService {

    private static final Logger log = LoggerFactory.getLogger(MikrotikRestService.class);
    private static final int LOG_LIMIT = 50;
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, Object>>> LIST_TYPE = new TypeReference<>() {};

    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${mikrotik.connection.timeout}")
    private int connectionTimeout;

    // ─── Coleta completa ──────────────────────────────────────────────────────

    public MikrotikDataDTO getFullData(ConnectionRequestDTO req) {
        try (var client = buildClient()) {
            var base = baseUrl(req.ip());
            var auth = basicAuth(req.username(), req.password());
            return new MikrotikDataDTO(
                    buildResources(client, base, auth),
                    buildInterfaces(client, base, auth),
                    buildRoutes(client, base, auth),
                    buildArp(client, base, auth),
                    buildDhcp(client, base, auth),
                    buildLogs(client, base, auth)
            );
        } catch (MikrotikConnectionException e) {
            throw e;
        } catch (Exception e) {
            throw new MikrotikConnectionException("Falha na REST API: " + e.getMessage(), "CONNECTION_ERROR");
        }
    }

    // ─── Endpoints individuais ────────────────────────────────────────────────

    public SystemResourceDTO getResources(ConnectionRequestDTO req) {
        try (var client = buildClient()) {
            return buildResources(client, baseUrl(req.ip()), basicAuth(req.username(), req.password()));
        } catch (Exception e) {
            throw new MikrotikConnectionException("Falha na REST API: " + e.getMessage(), "CONNECTION_ERROR");
        }
    }

    public List<InterfaceDTO> getInterfaces(ConnectionRequestDTO req) {
        try (var client = buildClient()) {
            return buildInterfaces(client, baseUrl(req.ip()), basicAuth(req.username(), req.password()));
        } catch (Exception e) {
            throw new MikrotikConnectionException("Falha na REST API: " + e.getMessage(), "CONNECTION_ERROR");
        }
    }

    public List<RouteDTO> getRoutes(ConnectionRequestDTO req) {
        try (var client = buildClient()) {
            return buildRoutes(client, baseUrl(req.ip()), basicAuth(req.username(), req.password()));
        } catch (Exception e) {
            throw new MikrotikConnectionException("Falha na REST API: " + e.getMessage(), "CONNECTION_ERROR");
        }
    }

    public List<ArpEntryDTO> getArp(ConnectionRequestDTO req) {
        try (var client = buildClient()) {
            return buildArp(client, baseUrl(req.ip()), basicAuth(req.username(), req.password()));
        } catch (Exception e) {
            throw new MikrotikConnectionException("Falha na REST API: " + e.getMessage(), "CONNECTION_ERROR");
        }
    }

    public List<DhcpLeaseDTO> getDhcp(ConnectionRequestDTO req) {
        try (var client = buildClient()) {
            return buildDhcp(client, baseUrl(req.ip()), basicAuth(req.username(), req.password()));
        } catch (Exception e) {
            throw new MikrotikConnectionException("Falha na REST API: " + e.getMessage(), "CONNECTION_ERROR");
        }
    }

    public List<LogEntryDTO> getLogs(ConnectionRequestDTO req) {
        try (var client = buildClient()) {
            return buildLogs(client, baseUrl(req.ip()), basicAuth(req.username(), req.password()));
        } catch (Exception e) {
            throw new MikrotikConnectionException("Falha na REST API: " + e.getMessage(), "CONNECTION_ERROR");
        }
    }

    // ─── Builders internos ────────────────────────────────────────────────────

    private SystemResourceDTO buildResources(CloseableHttpClient client, String base, String auth) throws Exception {
        var res = getMap(client, base + "/rest/system/resource", auth);
        var ident = getMap(client, base + "/rest/system/identity", auth);

        return new SystemResourceDTO(
                str(res, "version"),
                str(res, "uptime"),
                parseInt(res, "cpu-load"),
                parseLong(res, "total-memory"),
                parseLong(res, "free-memory"),
                parseLong(res, "total-hdd-space"),
                parseLong(res, "free-hdd-space"),
                str(ident, "name"),
                str(res, "platform"),
                str(res, "board-name")
        );
    }

    private List<InterfaceDTO> buildInterfaces(CloseableHttpClient client, String base, String auth) throws Exception {
        var result = new ArrayList<InterfaceDTO>();
        for (var r : getList(client, base + "/rest/interface", auth)) {
            result.add(new InterfaceDTO(
                    str(r, "name"),
                    str(r, "type"),
                    "true".equals(r.get("running")),
                    str(r, "mac-address"),
                    parseInt(r, "mtu"),
                    parseLong(r, "rx-byte"),
                    parseLong(r, "tx-byte"),
                    parseLong(r, "rx-error"),
                    parseLong(r, "tx-error"),
                    "true".equals(r.get("disabled"))
            ));
        }
        return result;
    }

    private List<RouteDTO> buildRoutes(CloseableHttpClient client, String base, String auth) throws Exception {
        var result = new ArrayList<RouteDTO>();
        for (var r : getList(client, base + "/rest/ip/route", auth)) {
            result.add(new RouteDTO(
                    str(r, "dst-address"),
                    str(r, "gateway"),
                    str(r, "interface"),
                    "true".equals(r.get("active")),
                    parseInt(r, "distance"),
                    detectType(r)
            ));
        }
        return result;
    }

    private List<ArpEntryDTO> buildArp(CloseableHttpClient client, String base, String auth) throws Exception {
        var result = new ArrayList<ArpEntryDTO>();
        for (var r : getList(client, base + "/rest/ip/arp", auth)) {
            String status = "true".equals(r.get("complete")) ? "complete"
                    : "true".equals(r.get("invalid")) ? "invalid" : "incomplete";
            result.add(new ArpEntryDTO(str(r, "address"), str(r, "mac-address"), str(r, "interface"), status));
        }
        return result;
    }

    private List<DhcpLeaseDTO> buildDhcp(CloseableHttpClient client, String base, String auth) throws Exception {
        var result = new ArrayList<DhcpLeaseDTO>();
        for (var r : getList(client, base + "/rest/ip/dhcp-server/lease", auth)) {
            result.add(new DhcpLeaseDTO(
                    str(r, "address"),
                    str(r, "mac-address"),
                    str(r, "host-name"),
                    str(r, "status"),
                    str(r, "expires-after")
            ));
        }
        return result;
    }

    private List<LogEntryDTO> buildLogs(CloseableHttpClient client, String base, String auth) throws Exception {
        var all = getList(client, base + "/rest/log", auth);
        var slice = all.size() > LOG_LIMIT ? all.subList(all.size() - LOG_LIMIT, all.size()) : all;
        var result = new ArrayList<LogEntryDTO>();
        for (var r : slice) {
            result.add(new LogEntryDTO(str(r, "time"), str(r, "topics"), str(r, "message")));
        }
        return result;
    }

    // ─── HTTP helpers ─────────────────────────────────────────────────────────

    private Map<String, Object> getMap(CloseableHttpClient client, String url, String auth) throws Exception {
        return mapper.readValue(execute(client, url, auth), MAP_TYPE);
    }

    private List<Map<String, Object>> getList(CloseableHttpClient client, String url, String auth) throws Exception {
        return mapper.readValue(execute(client, url, auth), LIST_TYPE);
    }

    private String execute(CloseableHttpClient client, String url, String auth) throws Exception {
        var req = new HttpGet(url);
        req.setHeader("Authorization", "Basic " + auth);
        return client.execute(req, response -> {
            int code = response.getCode();
            if (code == 401) throw new MikrotikConnectionException("Autenticação falhou", "AUTH_ERROR");
            if (code != 200) throw new MikrotikConnectionException("REST API retornou HTTP " + code, "CONNECTION_ERROR");
            return EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
        });
    }

    private CloseableHttpClient buildClient() {
        var config = RequestConfig.custom()
                .setConnectionRequestTimeout(connectionTimeout, TimeUnit.MILLISECONDS)
                .setResponseTimeout(connectionTimeout, TimeUnit.MILLISECONDS)
                .build();
        return HttpClients.custom().setDefaultRequestConfig(config).build();
    }

    private String baseUrl(String ip) {
        return "http://" + ip;
    }

    private String basicAuth(String user, String pass) {
        return Base64.getEncoder().encodeToString((user + ":" + pass).getBytes(StandardCharsets.UTF_8));
    }

    // ─── Parse helpers ────────────────────────────────────────────────────────

    private String str(Map<String, Object> m, String key) {
        var v = m.get(key);
        return v != null ? v.toString() : "";
    }

    private int parseInt(Map<String, Object> m, String key) {
        try {
            var raw = str(m, key).replaceAll("[^0-9]", "").strip();
            return raw.isEmpty() ? 0 : Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private long parseLong(Map<String, Object> m, String key) {
        try {
            var raw = str(m, key).replaceAll("[^0-9]", "").strip();
            return raw.isEmpty() ? 0L : Long.parseLong(raw);
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private String detectType(Map<String, Object> r) {
        if ("true".equals(r.get("ospf"))) return "ospf";
        if ("true".equals(r.get("bgp"))) return "bgp";
        if ("true".equals(r.get("rip"))) return "rip";
        if ("true".equals(r.get("static"))) return "static";
        if ("true".equals(r.get("connected"))) return "connected";
        if ("true".equals(r.get("dynamic"))) return "dynamic";
        return "unknown";
    }
}
