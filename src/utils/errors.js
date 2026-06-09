'use strict';

class MikrotikConnectionError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'MikrotikConnectionError';
  }
}

function mapException(err) {
  const msg = (err.message || '').toLowerCase();
  if (
    msg.includes('timed out') || msg.includes('econnrefused') ||
    msg.includes('etimedout') || msg.includes('enotfound') ||
    msg.includes('unreachable') || msg.includes('connection refused') ||
    msg.includes('connect')
  ) {
    return new MikrotikConnectionError('Host inacessível', 'TIMEOUT');
  }
  if (
    msg.includes('cannot log in') || msg.includes('invalid user') ||
    msg.includes('bad password') || msg.includes('login') || msg.includes('auth')
  ) {
    return new MikrotikConnectionError('Autenticação falhou', 'AUTH_ERROR');
  }
  if (msg.includes('api service') || msg.includes('service disabled')) {
    return new MikrotikConnectionError('Serviço API desabilitado no dispositivo', 'API_DISABLED');
  }
  return new MikrotikConnectionError(
    'Erro de conexão: ' + (err.message || 'desconhecido'),
    'CONNECTION_ERROR'
  );
}

module.exports = { MikrotikConnectionError, mapException };
