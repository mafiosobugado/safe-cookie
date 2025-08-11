/**
 * Constantes utilizadas pela aplicação Safe Cookie
 */

// URLs e domínios
const COMMON_PROTOCOLS = ['http:', 'https:'];
const DEFAULT_PORTS = {
  'http:': 80,
  'https:': 443
};

// Timeouts (em millisegundos)
const TIMEOUTS = {
  HTTP_REQUEST: 30000,
  SSL_CHECK: 10000,
  SSL_HANDSHAKE: 10000,
  CONNECT: 5000,
  DNS_LOOKUP: 5000
};

// User Agents
const USER_AGENTS = {
  default: 'Safe-Cookie-Bot/2.0 (+https://safecookie.app)',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
};

// Headers de segurança
const SECURITY_HEADERS = {
  'Strict-Transport-Security': {
    name: 'HSTS',
    critical: true
  },
  'Content-Security-Policy': {
    name: 'CSP',
    critical: true
  },
  'X-Frame-Options': {
    name: 'Frame Options',
    critical: true
  },
  'X-Content-Type-Options': {
    name: 'Content Type Options',
    critical: true
  },
  'X-XSS-Protection': {
    name: 'XSS Protection',
    critical: false
  },
  'Referrer-Policy': {
    name: 'Referrer Policy',
    critical: false
  }
};

// Códigos de erro HTTP
const HTTP_ERROR_MESSAGES = {
  400: 'Requisição inválida',
  401: 'Não autorizado',
  403: 'Acesso negado',
  404: 'Recurso não encontrado',
  405: 'Método não permitido',
  429: 'Muitas requisições',
  500: 'Erro interno do servidor',
  502: 'Gateway inválido',
  503: 'Serviço indisponível',
  504: 'Timeout do gateway'
};

// Tipos de vulnerabilidades
const VULNERABILITY_TYPES = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

// Scores e grades
const SCORE_THRESHOLDS = {
  A_PLUS: 95,
  A: 85,
  B: 75,
  C: 65,
  D: 50,
  F: 0
};

// Configurações SSL
const SSL_CONFIG = {
  SUPPORTED_PROTOCOLS: ['TLSv1.2', 'TLSv1.3'],
  WEAK_CIPHERS: [
    'RC4',
    'DES',
    '3DES',
    'MD5',
    'SHA1'
  ],
  STRONG_CIPHERS: [
    'AES256-GCM',
    'AES128-GCM',
    'CHACHA20-POLY1305'
  ]
};

// Configurações de cookies
const COOKIE_CONFIG = {
  SECURE_FLAGS: ['Secure', 'HttpOnly', 'SameSite'],
  SAMESITE_VALUES: ['Strict', 'Lax', 'None'],
  MAX_AGE_WARNING: 365 * 24 * 60 * 60 // 1 ano em segundos
};

// Regex patterns
const PATTERNS = {
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  IP: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  DOMAIN: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
};

// Regex para compatibilidade
const REGEX = {
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  DOMAIN: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
};

// Mensagens de erro personalizadas
const ERROR_MESSAGES = {
  INVALID_URL: 'URL inválida. Verifique o formato e tente novamente.',
  CONNECTION_FAILED: 'Não foi possível conectar ao servidor.',
  TIMEOUT: 'Tempo limite de conexão excedido.',
  SSL_ERROR: 'Erro na verificação SSL/TLS.',
  DNS_ERROR: 'Erro na resolução DNS.',
  NETWORK_ERROR: 'Erro de rede. Verifique sua conexão.',
  BLOCKED_URL: 'URL bloqueada por políticas de segurança.',
  RATE_LIMITED: 'Muitas requisições. Tente novamente em alguns minutos.'
};

// Configurações de análise
const ANALYSIS_CONFIG = {
  MAX_REDIRECTS: 5,
  MAX_RESPONSE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_COOKIES: 50,
  MAX_HEADERS: 100,
  PARALLEL_CHECKS: true
};

// Algoritmos de hash seguros
const SECURE_HASH_ALGORITHMS = [
  'SHA256', 'SHA384', 'SHA512', 'SHA-256', 'SHA-384', 'SHA-512'
];

// Tamanhos mínimos de chave
const MIN_KEY_SIZES = {
  RSA: 2048,
  ECDSA: 256,
  DSA: 2048,
  DH: 2048
};

// Erros de rede
const NETWORK_ERRORS = {
  ENOTFOUND: 'Domínio não encontrado',
  ECONNREFUSED: 'Conexão recusada',
  ETIMEDOUT: 'Tempo limite esgotado',
  ECONNRESET: 'Conexão resetada',
  EHOSTUNREACH: 'Host inacessível',
  ENETUNREACH: 'Rede inacessível',
  EPROTO: 'Erro de protocolo',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'Certificado auto-assinado',
  SELF_SIGNED_CERT_IN_CHAIN: 'Certificado auto-assinado na cadeia',
  CERT_HAS_EXPIRED: 'Certificado expirado',
  CERT_NOT_YET_VALID: 'Certificado ainda não válido'
};

module.exports = {
  COMMON_PROTOCOLS,
  DEFAULT_PORTS,
  TIMEOUTS,
  USER_AGENTS,
  SECURITY_HEADERS,
  HTTP_ERROR_MESSAGES,
  VULNERABILITY_TYPES,
  SCORE_THRESHOLDS,
  SSL_CONFIG,
  COOKIE_CONFIG,
  PATTERNS,
  REGEX,
  ERROR_MESSAGES,
  ANALYSIS_CONFIG,
  SECURE_HASH_ALGORITHMS,
  MIN_KEY_SIZES,
  NETWORK_ERRORS
};
