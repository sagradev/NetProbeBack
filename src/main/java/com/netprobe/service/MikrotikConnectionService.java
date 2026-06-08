package com.netprobe.service;

import com.netprobe.dto.*;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Detecta a versão da API do MikroTik e delega ao serviço correto.
 * Tenta primeiro a REST API (RouterOS v7+); se falhar, usa a RouterOS API proprietária (v6-).
 */
@Service
public class MikrotikConnectionService {

    private static final Logger log = LoggerFactory.getLogger(MikrotikConnectionService.class);

    private final MikrotikRestService restService;
    private final MikrotikApiService apiService;

    @Value("${mikrotik.connection.timeout}")
    private int connectionTimeout;

    public MikrotikConnectionService(MikrotikRestService restService, MikrotikApiService apiService) {
        this.restService = restService;
        this.apiService = apiService;
    }

    public MikrotikDataDTO getFullData(ConnectionRequestDTO req) {
        return useRest(req) ? restService.getFullData(req) : apiService.getFullData(req);
    }

    public SystemResourceDTO getResources(ConnectionRequestDTO req) {
        return useRest(req) ? restService.getResources(req) : apiService.getResources(req);
    }

    public List<InterfaceDTO> getInterfaces(ConnectionRequestDTO req) {
        return useRest(req) ? restService.getInterfaces(req) : apiService.getInterfaces(req);
    }

    public List<RouteDTO> getRoutes(ConnectionRequestDTO req) {
        return useRest(req) ? restService.getRoutes(req) : apiService.getRoutes(req);
    }

    public List<ArpEntryDTO> getArp(ConnectionRequestDTO req) {
        return useRest(req) ? restService.getArp(req) : apiService.getArp(req);
    }

    public List<DhcpLeaseDTO> getDhcp(ConnectionRequestDTO req) {
        return useRest(req) ? restService.getDhcp(req) : apiService.getDhcp(req);
    }

    public List<LogEntryDTO> getLogs(ConnectionRequestDTO req) {
        return useRest(req) ? restService.getLogs(req) : apiService.getLogs(req);
    }

    // ─── Detecção de versão ───────────────────────────────────────────────────

    private boolean useRest(ConnectionRequestDTO req) {
        return isRestDisponivel(req.ip(), req.username(), req.password());
    }

    private boolean isRestDisponivel(String ip, String username, String password) {
        int detectTimeout = Math.min(connectionTimeout, 3000);
        var config = RequestConfig.custom()
                .setConnectionRequestTimeout(detectTimeout, TimeUnit.MILLISECONDS)
                .setResponseTimeout(detectTimeout, TimeUnit.MILLISECONDS)
                .build();

        try (var client = HttpClients.custom().setDefaultRequestConfig(config).build()) {
            var request = new HttpGet("http://" + ip + "/rest/system/resource");
            var auth = Base64.getEncoder()
                    .encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));
            request.setHeader("Authorization", "Basic " + auth);

            return client.execute(request, response -> {
                int code = response.getCode();
                log.debug("Detecção REST em {}: HTTP {}", ip, code);
                return code == 200 || code == 401;
            });
        } catch (Exception e) {
            log.debug("REST API não disponível em {} — usando RouterOS API. Motivo: {}", ip, e.getMessage());
            return false;
        }
    }
}
