package com.netprobe.exception;

public class MikrotikConnectionException extends RuntimeException {

    private final String code;

    public MikrotikConnectionException(String message, String code) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
