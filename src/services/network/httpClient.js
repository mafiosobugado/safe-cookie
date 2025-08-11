const axios = require('axios');
const https = require('https');
const { TIMEOUTS, USER_AGENTS } = require('../../utils/constants');
const logger = require('../../utils/logger');
const errorHandler = require('./errorHandler');

/**
 * Cliente HTTP robusto com retry, timeout e tratamento de erros
 */
class HttpClient {
  
  constructor() {
    this.defaultConfig = {
      timeout: TIMEOUTS.HTTP_REQUEST,
      maxRedirects: 5,
      validateStatus: (status) => status < 600, // Aceita todos os códigos para análise
      headers: {
        'User-Agent': this._getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Para analisar sites com SSL inválido
        timeout: TIMEOUTS.SSL_HANDSHAKE
      })
    };
  }

  /**
   * Faz uma requisição HTTP com retry automático
   * @param {string} url - URL para requisição
   * @param {Object} options - Opções da requisição
   * @returns {Promise<Object>} - Resposta da requisição
   */
  async get(url, options = {}) {
    const startTime = Date.now();
    const config = { ...this.defaultConfig, ...options };
    
    logger.analysis(url, 'http_request_start');
    
    try {
      const response = await this._makeRequestWithRetry(url, config);
      
      const duration = Date.now() - startTime;
      logger.performance('http_request', duration, {
        url,
        status: response.status,
        responseSize: response.data?.length || 0
      });
      
      return this._processResponse(response, url);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.errorWithContext(error, { url, duration });
      
      throw errorHandler.processNetworkError(error, url);
    }
  }

  /**
   * Faz requisição HEAD para verificar disponibilidade
   * @param {string} url - URL para verificar
   * @returns {Promise<Object>} - Headers da resposta
   */
  async head(url, options = {}) {
    const config = { 
      ...this.defaultConfig, 
      ...options,
      method: 'HEAD',
      timeout: TIMEOUTS.CONNECT
    };
    
    try {
      const response = await axios(url, config);
      return {
        status: response.status,
        headers: response.headers,
        isAvailable: response.status < 400
      };
    } catch (error) {
      throw errorHandler.processNetworkError(error, url);
    }
  }

  /**
   * Faz uma requisição com retry automático
   * @private
   */
  async _makeRequestWithRetry(url, config, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Adicionar delay progressivo entre tentativas
        if (attempt > 1) {
          await this._delay(attempt * 1000);
          logger.analysis(url, 'http_retry', { attempt });
        }
        
        const response = await axios.get(url, {
          ...config,
          headers: {
            ...config.headers,
            'User-Agent': this._getRandomUserAgent() // Variar User-Agent
          }
        });
        
        return response;
        
      } catch (error) {
        lastError = error;
        
        // Não tentar novamente para alguns erros específicos
        if (this._isNonRetryableError(error)) {
          break;
        }
        
        logger.analysis(url, 'http_retry_failed', { 
          attempt, 
          error: error.message 
        });
      }
    }
    
    throw lastError;
  }

  /**
   * Processa a resposta HTTP
   * @private
   */
  _processResponse(response, originalUrl) {
    const processedResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: this._normalizeHeaders(response.headers),
      data: response.data,
      url: response.config.url || originalUrl,
      finalUrl: response.request?.res?.responseUrl || response.config.url,
      redirectCount: this._countRedirects(response),
      timing: this._extractTiming(response),
      ssl: this._extractSSLInfo(response),
      cookies: this._extractCookies(response.headers),
      size: {
        headers: JSON.stringify(response.headers).length,
        body: response.data?.length || 0,
        total: JSON.stringify(response.headers).length + (response.data?.length || 0)
      }
    };

    // Verificar se houve redirecionamento
    if (processedResponse.finalUrl !== originalUrl) {
      processedResponse.wasRedirected = true;
      processedResponse.redirectChain = this._extractRedirectChain(response);
    }

    return processedResponse;
  }

  /**
   * Normaliza headers para análise consistente
   * @private
   */
  _normalizeHeaders(headers) {
    const normalized = {};
    
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    
    return normalized;
  }

  /**
   * Conta o número de redirecionamentos
   * @private
   */
  _countRedirects(response) {
    return response.request?._redirectable?._redirectCount || 0;
  }

  /**
   * Extrai informações de timing da requisição
   * @private
   */
  _extractTiming(response) {
    const config = response.config;
    return {
      lookup: config.lookup || 0,
      connect: config.connect || 0,
      secureConnect: config.secureConnect || 0,
      upload: config.upload || 0,
      response: config.response || 0,
      end: config.end || 0,
      total: config.total || 0
    };
  }

  /**
   * Extrai informações SSL/TLS
   * @private
   */
  _extractSSLInfo(response) {
    const socket = response.request?.socket;
    
    if (!socket || !socket.authorized) {
      return null;
    }
    
    const cert = socket.getPeerCertificate();
    
    return {
      authorized: socket.authorized,
      protocol: socket.getProtocol?.() || null,
      cipher: socket.getCipher?.() || null,
      certificate: cert ? {
        subject: cert.subject,
        issuer: cert.issuer,
        valid_from: cert.valid_from,
        valid_to: cert.valid_to,
        fingerprint: cert.fingerprint,
        serialNumber: cert.serialNumber
      } : null
    };
  }

  /**
   * Extrai cookies da resposta
   * @private
   */
  _extractCookies(headers) {
    const setCookieHeader = headers['set-cookie'];
    if (!setCookieHeader) return [];
    
    return Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  }

  /**
   * Extrai cadeia de redirecionamentos
   * @private
   */
  _extractRedirectChain(response) {
    // Esta implementação pode ser expandida conforme necessário
    return response.request?._redirects || [];
  }

  /**
   * Verifica se o erro não deve ser repetido
   * @private
   */
  _isNonRetryableError(error) {
    if (!error.response) {
      // Erros de rede podem ser temporários
      return false;
    }
    
    const status = error.response.status;
    
    // Não repetir para erros do cliente (4xx exceto alguns específicos)
    return status >= 400 && status < 500 && ![408, 429].includes(status);
  }

  /**
   * Retorna um User-Agent aleatório
   * @private
   */
  _getRandomUserAgent() {
    const userAgents = Object.values(USER_AGENTS);
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Delay assíncrono
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cria uma instância customizada do cliente
   * @param {Object} config - Configuração customizada
   */
  createCustomInstance(config = {}) {
    return axios.create({
      ...this.defaultConfig,
      ...config
    });
  }
}

module.exports = new HttpClient();
