const url = require('url');
const dns = require('dns').promises;
const { REGEX, DEFAULT_PORTS } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Classe para validação e normalização de URLs
 */
class URLValidator {
  
  /**
   * Valida e normaliza uma URL, priorizando HTTPS
   * @param {string} inputUrl - URL fornecida pelo usuário
   * @returns {Promise<Object>} - Objeto com URL validada e metadados
   */
  async validateAndNormalize(inputUrl) {
    const startTime = Date.now();
    
    try {
      // Limpar e normalizar entrada
      const cleanUrl = this._cleanInput(inputUrl);
      
      // Tentar diferentes variações da URL
      const urlVariations = this._generateUrlVariations(cleanUrl);
      
      // Validar cada variação
      let validatedUrl = null;
      let validationErrors = [];
      
      for (const variation of urlVariations) {
        try {
          const result = await this._validateSingleUrl(variation);
          if (result.isValid) {
            validatedUrl = result;
            break;
          } else {
            validationErrors.push({
              url: variation,
              errors: result.errors
            });
          }
        } catch (error) {
          validationErrors.push({
            url: variation,
            errors: [error.message]
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.performance('url_validation', duration, { inputUrl, success: !!validatedUrl });
      
      if (!validatedUrl) {
        return {
          isValid: false,
          errors: validationErrors,
          suggestions: this._generateSuggestions(cleanUrl)
        };
      }
      
      return {
        isValid: true,
        url: validatedUrl.url,
        normalizedUrl: validatedUrl.normalizedUrl,
        protocol: validatedUrl.protocol,
        hostname: validatedUrl.hostname,
        port: validatedUrl.port,
        isHttps: validatedUrl.protocol === 'https:',
        metadata: validatedUrl.metadata
      };
      
    } catch (error) {
      logger.errorWithContext(error, { inputUrl });
      return {
        isValid: false,
        errors: ['Erro interno na validação da URL'],
        suggestions: []
      };
    }
  }
  
  /**
   * Limpa e normaliza a entrada do usuário
   * @private
   */
  _cleanInput(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('URL é obrigatória');
    }
    
    return input.trim().toLowerCase();
  }
  
  /**
   * Gera variações da URL para teste, priorizando HTTPS
   * @private
   */
  _generateUrlVariations(cleanUrl) {
    const variations = [];
    
    // Se já tem protocolo, usar como está e tentar HTTPS
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      variations.push(cleanUrl);
      
      // Se é HTTP, tentar HTTPS também
      if (cleanUrl.startsWith('http://')) {
        variations.unshift(cleanUrl.replace('http://', 'https://'));
      }
    } else {
      // Sem protocolo - priorizar HTTPS
      variations.push(`https://${cleanUrl}`);
      variations.push(`http://${cleanUrl}`);
      
      // Tentar com www se não tem
      if (!cleanUrl.startsWith('www.')) {
        variations.push(`https://www.${cleanUrl}`);
        variations.push(`http://www.${cleanUrl}`);
      }
    }
    
    return variations;
  }
  
  /**
   * Valida uma única URL
   * @private
   */
  async _validateSingleUrl(testUrl) {
    const errors = [];
    let parsedUrl;
    
    try {
      parsedUrl = new URL(testUrl);
    } catch (error) {
      return {
        isValid: false,
        errors: ['URL malformada']
      };
    }
    
    // Validar protocolo
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      errors.push('Protocolo deve ser HTTP ou HTTPS');
    }
    
    // Validar hostname
    if (!parsedUrl.hostname) {
      errors.push('Hostname inválido');
    }
    
    // Validar formato do hostname
    if (parsedUrl.hostname && !this._isValidHostname(parsedUrl.hostname)) {
      errors.push('Formato do hostname inválido');
    }
    
    // Verificar se é IP local/privado
    if (this._isPrivateIP(parsedUrl.hostname)) {
      errors.push('IPs privados não são permitidos');
    }
    
    // Tentar resolver DNS
    try {
      await this._resolveDNS(parsedUrl.hostname);
    } catch (dnsError) {
      errors.push(`DNS não resolve: ${dnsError.message}`);
    }
    
    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      };
    }
    
    return {
      isValid: true,
      url: testUrl,
      normalizedUrl: this._normalizeUrl(parsedUrl),
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || DEFAULT_PORTS[parsedUrl.protocol],
      metadata: {
        hasWww: parsedUrl.hostname.startsWith('www.'),
        isIP: this._isIP(parsedUrl.hostname),
        defaultPort: !parsedUrl.port
      }
    };
  }
  
  /**
   * Valida formato do hostname
   * @private
   */
  _isValidHostname(hostname) {
    // Verificar se é IP válido
    if (this._isIP(hostname)) {
      return true;
    }
    
    // Verificar se é domínio válido
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(hostname) && hostname.length <= 253;
  }
  
  /**
   * Verifica se é um endereço IP
   * @private
   */
  _isIP(hostname) {
    return REGEX.IPV4.test(hostname) || REGEX.IPV6.test(hostname);
  }
  
  /**
   * Verifica se é IP privado/local
   * @private
   */
  _isPrivateIP(hostname) {
    if (!REGEX.IPV4.test(hostname)) {
      return false;
    }
    
    const parts = hostname.split('.').map(Number);
    
    // Ranges privados
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127 || // localhost
      parts[0] === 0      // 0.0.0.0
    );
  }
  
  /**
   * Resolve DNS com timeout
   * @private
   */
  async _resolveDNS(hostname) {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('DNS timeout')), 5000);
    });
    
    const resolution = dns.lookup(hostname);
    
    return Promise.race([resolution, timeout]);
  }
  
  /**
   * Normaliza a URL para formato consistente
   * @private
   */
  _normalizeUrl(parsedUrl) {
    let normalized = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    
    // Adicionar porta se não for padrão
    if (parsedUrl.port && parsedUrl.port !== DEFAULT_PORTS[parsedUrl.protocol]) {
      normalized += `:${parsedUrl.port}`;
    }
    
    // Adicionar path, removendo trailing slash se é só "/"
    const pathname = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname;
    normalized += pathname;
    
    // Adicionar query string se existe
    if (parsedUrl.search) {
      normalized += parsedUrl.search;
    }
    
    return normalized;
  }
  
  /**
   * Gera sugestões para URLs inválidas
   * @private
   */
  _generateSuggestions(input) {
    const suggestions = [];
    
    // Sugestões comuns
    if (!input.includes('.')) {
      suggestions.push(`${input}.com`);
      suggestions.push(`${input}.org`);
      suggestions.push(`${input}.net`);
    }
    
    // Adicionar www se não tem
    if (!input.startsWith('www.') && input.includes('.')) {
      suggestions.push(`www.${input}`);
    }
    
    // Corrigir erros comuns
    const commonTypos = {
      'htttp://': 'http://',
      'htp://': 'http://',
      'https//': 'https://',
      '.co': '.com',
      '.con': '.com'
    };
    
    for (const [typo, correction] of Object.entries(commonTypos)) {
      if (input.includes(typo)) {
        suggestions.push(input.replace(typo, correction));
      }
    }
    
    return [...new Set(suggestions)]; // Remove duplicatas
  }
}

module.exports = new URLValidator();
