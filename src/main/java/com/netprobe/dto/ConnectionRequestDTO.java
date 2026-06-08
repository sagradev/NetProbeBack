package com.netprobe.dto;

/**
 * port é opcional — se null ou 0, o backend usa 8728 (padrão RouterOS API).
 */
public record ConnectionRequestDTO(String ip, String username, String password, Integer port) {}
