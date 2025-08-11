/**
 * Configurações de segurança para headers HTTP
 */

const SECURITY_HEADERS = {
  'Content-Security-Policy': {
    description: 'Ajuda a prevenir ataques como Cross Site Scripting (XSS), especificando quais fontes de conteúdo são consideradas seguras.',
    severity: 'critical',
    weight: 15
  },
  'Strict-Transport-Security': {
    description: 'Garante que os navegadores se comuniquem com o servidor apenas via HTTPS, protegendo contra ataques de downgrade.',
    severity: 'critical',
    weight: 15
  },
  'X-Frame-Options': {
    description: 'Impede que o site seja carregado dentro de um iframe, protegendo contra ataques de clickjacking.',
    severity: 'high',
    weight: 10
  },
  'X-Content-Type-Options': {
    description: 'Evita que o navegador tente adivinhar o tipo de conteúdo (MIME sniffing), o que pode prevenir execução de código malicioso.',
    severity: 'high',
    weight: 10
  },
  'Referrer-Policy': {
    description: 'Controla quais informações do referenciador (referer) são enviadas quando um link é clicado.',
    severity: 'medium',
    weight: 5
  },
  'Permissions-Policy': {
    description: 'Permite controlar o acesso a funcionalidades do navegador, como câmera, microfone, localização etc.',
    severity: 'medium',
    weight: 5
  },
  'X-XSS-Protection': {
    description: 'Ativa a proteção contra ataques de Cross Site Scripting (XSS) nos navegadores antigos.',
    severity: 'medium',
    weight: 5
  },
  'Expect-CT': {
    description: 'Permite monitorar e aplicar a política de Certificação Transparente (Certificate Transparency).',
    severity: 'low',
    weight: 3
  },
  'Cache-Control': {
    description: 'Controla como as respostas são armazenadas em cache. Pode evitar que dados sensíveis fiquem salvos no navegador.',
    severity: 'medium',
    weight: 5
  },
  'Pragma': {
    description: 'Usado junto com Cache-Control para garantir que dados sensíveis não sejam armazenados em cache.',
    severity: 'low',
    weight: 3
  }
};

const VULNERABILITY_CATEGORIES = {
  critical: { min: 0, max: 3, color: '#e53935', label: 'Crítico' },
  high: { min: 4, max: 6, color: '#ff5722', label: 'Alto' },
  medium: { min: 7, max: 8, color: '#ff9800', label: 'Médio' },
  low: { min: 9, max: 10, color: '#4caf50', label: 'Baixo' }
};

const SSL_CONFIG = {
  minimumVersion: 'TLSv1.2',
  preferredCiphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256'
  ],
  checkOcsp: true,
  validateChain: true
};

const COOKIE_SECURITY = {
  required: ['httpOnly', 'secure'],
  recommended: ['sameSite'],
  dangerousNames: ['password', 'token', 'session', 'auth', 'csrf'],
  maxAge: 86400000 // 24 horas em ms
};

module.exports = {
  SECURITY_HEADERS,
  VULNERABILITY_CATEGORIES,
  SSL_CONFIG,
  COOKIE_SECURITY
};
