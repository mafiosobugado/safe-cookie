const tls = require('tls');
const crypto = require('crypto');
const { URL } = require('url');
const { TIMEOUTS, SECURE_HASH_ALGORITHMS, MIN_KEY_SIZES } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Analisador de certificados SSL/TLS
 */
class SSLAnalyzer {

  /**
   * Analisa o certificado SSL de uma URL
   * @param {string} url - URL para analisar
   * @returns {Promise<Object>} - Análise completa do SSL
   */
  async analyzeSSL(url) {
    const startTime = Date.now();
    
    try {
      const parsedUrl = new URL(url);
      
      // Só analisar HTTPS
      if (parsedUrl.protocol !== 'https:') {
        return {
          isSecure: false,
          reason: 'URL não usa HTTPS',
          score: 0,
          recommendations: ['Use HTTPS para proteger a comunicação']
        };
      }

      // Tentar análise detalhada primeiro
      try {
        const sslInfo = await this._getSSLInfo(parsedUrl.hostname, parsedUrl.port || 443);
        const analysis = this._analyzeSSLInfo(sslInfo);
        
        const duration = Date.now() - startTime;
        logger.performance('ssl_analysis', duration, { url, isValid: analysis.isValid });
        
        return analysis;
      } catch (detailedError) {
        // Se a análise detalhada falhar, tentar análise simples
        logger.errorWithContext(detailedError, { url, fallback: 'trying_simple_analysis' });
        
        const simpleAnalysis = await this._performSimpleSSLCheck(parsedUrl.hostname, parsedUrl.port || 443);
        
        const duration = Date.now() - startTime;
        logger.performance('ssl_analysis_simple', duration, { url, isValid: simpleAnalysis.isValid });
        
        return simpleAnalysis;
      }
      
    } catch (error) {
      logger.errorWithContext(error, { url });
      return this._handleSSLError(error);
    }
  }

  /**
   * Obtém informações SSL via conexão direta
   * @private
   */
  async _getSSLInfo(hostname, port) {
    return new Promise((resolve, reject) => {
      const options = {
        host: hostname,
        port: port,
        rejectUnauthorized: false, // Para analisar certificados inválidos
        timeout: TIMEOUTS.SSL_HANDSHAKE,
        // Configurações mais tolerantes para conexões SSL problemáticas
        secureProtocol: 'TLS_method', // Permite negociação automática da versão TLS
        ciphers: 'ALL:@SECLEVEL=0', // Permite ciphers mais antigas se necessário
        honorCipherOrder: false,
        checkServerIdentity: () => { return undefined; } // Desabilita verificação de identidade
      };

      let timeoutId;
      const socket = tls.connect(options);
      
      // Configurar timeout manual mais robusto
      timeoutId = setTimeout(() => {
        socket.destroy();
        reject(new Error('SSL handshake timeout'));
      }, TIMEOUTS.SSL_HANDSHAKE);

      socket.on('secureConnect', () => {
        try {
          clearTimeout(timeoutId);
          
          const cert = socket.getPeerCertificate(true);
          const protocol = socket.getProtocol();
          const cipher = socket.getCipher();
          const authorized = socket.authorized;
          const authorizationError = socket.authorizationError;

          const sslInfo = {
            certificate: cert,
            protocol,
            cipher,
            authorized,
            authorizationError,
            ephemeralKeyInfo: socket.getEphemeralKeyInfo?.() || null,
            finished: socket.getFinished?.() || null,
            peerFinished: socket.getPeerFinished?.() || null
          };

          socket.destroy();
          resolve(sslInfo);
        } catch (error) {
          clearTimeout(timeoutId);
          socket.destroy();
          reject(error);
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timeoutId);
        socket.destroy();
        
        // Classificar tipos de erro SSL para melhor tratamento
        if (error.code) {
          switch (error.code) {
            case 'ECONNREFUSED':
              reject(new Error('Conexão SSL recusada'));
              break;
            case 'ENOTFOUND':
              reject(new Error('Servidor não encontrado'));
              break;
            case 'ETIMEDOUT':
              reject(new Error('Timeout na conexão SSL'));
              break;
            case 'ECONNRESET':
              reject(new Error('Conexão SSL resetada pelo servidor'));
              break;
            default:
              reject(new Error(`Erro SSL: ${error.message}`));
          }
        } else if (error.message.includes('alert')) {
          // Alertas SSL específicos
          reject(new Error('Servidor SSL rejeitou a conexão'));
        } else {
          reject(error);
        }
      });

      socket.on('timeout', () => {
        clearTimeout(timeoutId);
        socket.destroy();
        reject(new Error('SSL connection timeout'));
      });
    });
  }

  /**
   * Realizar verificação SSL simples quando a análise detalhada falha
   * @private
   */
  async _performSimpleSSLCheck(hostname, port) {
    const https = require('https');
    
    return new Promise((resolve) => {
      const options = {
        hostname,
        port,
        method: 'HEAD',
        timeout: 5000,
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        const socket = res.socket;
        
        if (socket && socket.authorized !== undefined) {
          const cert = socket.getPeerCertificate();
          
          resolve({
            isValid: socket.authorized,
            isSecure: true,
            method: 'simple_check',
            score: socket.authorized ? 70 : 30,
            certificate: {
              valid: !!cert.valid_to,
              issuer: cert.issuer?.CN || 'Unknown',
              validTo: cert.valid_to,
              expired: cert.valid_to ? new Date(cert.valid_to) < new Date() : false
            },
            vulnerabilities: socket.authorized ? [] : [{
              type: 'ssl_validation_failed',
              severity: 'high',
              message: 'Certificado SSL não é válido',
              impact: 'Conexão pode não ser segura'
            }],
            recommendations: socket.authorized ? 
              ['Certificado SSL válido encontrado'] : 
              ['Corrija os problemas do certificado SSL']
          });
        } else {
          resolve({
            isValid: false,
            isSecure: false,
            method: 'simple_check',
            score: 20,
            error: 'Não foi possível verificar o certificado SSL',
            vulnerabilities: [{
              type: 'ssl_check_failed',
              severity: 'medium',
              message: 'Verificação SSL simplificada falhou',
              impact: 'Não foi possível determinar a segurança SSL'
            }],
            recommendations: ['Verifique manualmente o certificado SSL']
          });
        }
      });

      req.on('error', () => {
        resolve({
          isValid: false,
          isSecure: false,
          method: 'simple_check',
          score: 0,
          error: 'Falha na conexão SSL',
          vulnerabilities: [{
            type: 'ssl_connection_failed',
            severity: 'critical',
            message: 'Não foi possível conectar via SSL',
            impact: 'Site pode não suportar HTTPS adequadamente'
          }],
          recommendations: [
            'Verifique se o site suporta HTTPS',
            'Servidor pode ter problemas de configuração SSL'
          ]
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          isValid: false,
          isSecure: false,
          method: 'simple_check',
          score: 10,
          error: 'Timeout na verificação SSL',
          vulnerabilities: [{
            type: 'ssl_timeout',
            severity: 'medium',
            message: 'Timeout na conexão SSL',
            impact: 'Servidor pode estar lento ou sobrecarregado'
          }],
          recommendations: ['Tente novamente em alguns minutos']
        });
      });

      req.end();
    });
  }

  /**
   * Analisa as informações SSL coletadas
   * @private
   */
  _analyzeSSLInfo(sslInfo) {
    const analysis = {
      isValid: sslInfo.authorized,
      certificate: this._analyzeCertificate(sslInfo.certificate),
      protocol: this._analyzeProtocol(sslInfo.protocol),
      cipher: this._analyzeCipher(sslInfo.cipher),
      vulnerabilities: [],
      score: 0,
      recommendations: []
    };

    // Analisar problemas de autorização
    if (!sslInfo.authorized && sslInfo.authorizationError) {
      analysis.vulnerabilities.push({
        type: 'authorization',
        severity: 'critical',
        message: `Certificado não autorizado: ${sslInfo.authorizationError}`,
        impact: 'Conexão não é confiável'
      });
    }

    // Calcular score baseado nos componentes
    analysis.score = this._calculateSSLScore(analysis);

    // Gerar recomendações
    analysis.recommendations = this._generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Analisa o certificado
   * @private
   */
  _analyzeCertificate(cert) {
    if (!cert || typeof cert !== 'object') {
      return {
        isValid: false,
        error: 'Certificado não encontrado'
      };
    }

    const now = new Date();
    const validFrom = new Date(cert.valid_from);
    const validTo = new Date(cert.valid_to);
    const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));

    const analysis = {
      subject: cert.subject,
      issuer: cert.issuer,
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
      fingerprint256: cert.fingerprint256,
      validFrom: cert.valid_from,
      validTo: cert.valid_to,
      daysUntilExpiry,
      isExpired: validTo < now,
      isNotYetValid: validFrom > now,
      algorithm: this._extractSignatureAlgorithm(cert),
      keySize: this._extractKeySize(cert),
      extensions: this._analyzeExtensions(cert),
      chain: this._analyzeChain(cert),
      vulnerabilities: []
    };

    // Verificar expiração
    if (analysis.isExpired) {
      analysis.vulnerabilities.push({
        type: 'expired',
        severity: 'critical',
        message: 'Certificado expirado',
        impact: 'Navegadores mostrarão aviso de segurança'
      });
    } else if (daysUntilExpiry <= 30) {
      analysis.vulnerabilities.push({
        type: 'expiring_soon',
        severity: 'warning',
        message: `Certificado expira em ${daysUntilExpiry} dias`,
        impact: 'Necessário renovar o certificado em breve'
      });
    }

    // Verificar algoritmo de assinatura
    if (!this._isSecureHashAlgorithm(analysis.algorithm)) {
      analysis.vulnerabilities.push({
        type: 'weak_signature',
        severity: 'high',
        message: `Algoritmo de assinatura fraco: ${analysis.algorithm}`,
        impact: 'Vulnerável a ataques de falsificação'
      });
    }

    // Verificar tamanho da chave
    if (!this._isSecureKeySize(analysis.algorithm, analysis.keySize)) {
      analysis.vulnerabilities.push({
        type: 'weak_key',
        severity: 'high',
        message: `Tamanho de chave inseguro: ${analysis.keySize} bits`,
        impact: 'Vulnerável a ataques de força bruta'
      });
    }

    return analysis;
  }

  /**
   * Analisa o protocolo TLS
   * @private
   */
  _analyzeProtocol(protocol) {
    const analysis = {
      version: protocol,
      isSecure: false,
      vulnerabilities: []
    };

    if (!protocol) {
      analysis.vulnerabilities.push({
        type: 'no_protocol',
        severity: 'critical',
        message: 'Protocolo TLS não identificado'
      });
      return analysis;
    }

    // Verificar versão do protocolo
    const version = protocol.toLowerCase();
    
    if (version.includes('tlsv1.3')) {
      analysis.isSecure = true;
      analysis.grade = 'A+';
    } else if (version.includes('tlsv1.2')) {
      analysis.isSecure = true;
      analysis.grade = 'A';
    } else if (version.includes('tlsv1.1')) {
      analysis.grade = 'B';
      analysis.vulnerabilities.push({
        type: 'deprecated_protocol',
        severity: 'medium',
        message: 'TLS 1.1 é considerado obsoleto',
        impact: 'Recomendado atualizar para TLS 1.2 ou superior'
      });
    } else if (version.includes('tlsv1.0') || version.includes('sslv')) {
      analysis.grade = 'F';
      analysis.vulnerabilities.push({
        type: 'insecure_protocol',
        severity: 'critical',
        message: 'Protocolo inseguro ou obsoleto',
        impact: 'Vulnerável a diversos ataques'
      });
    }

    return analysis;
  }

  /**
   * Analisa a cipher suite
   * @private
   */
  _analyzeCipher(cipher) {
    if (!cipher) {
      return {
        isSecure: false,
        error: 'Cipher não identificado'
      };
    }

    const analysis = {
      name: cipher.name,
      version: cipher.version,
      bits: cipher.bits,
      algorithm: this._extractCipherAlgorithm(cipher.name),
      keyExchange: this._extractKeyExchange(cipher.name),
      authentication: this._extractAuthentication(cipher.name),
      isSecure: false,
      vulnerabilities: []
    };

    // Verificar força da cipher
    if (analysis.bits < 128) {
      analysis.vulnerabilities.push({
        type: 'weak_cipher',
        severity: 'critical',
        message: `Cipher fraca: ${analysis.bits} bits`,
        impact: 'Facilmente quebrada por atacantes'
      });
    } else if (analysis.bits >= 256) {
      analysis.isSecure = true;
    } else if (analysis.bits >= 128) {
      analysis.isSecure = true;
    }

    // Verificar algoritmos inseguros
    const insecureAlgorithms = ['RC4', 'DES', '3DES', 'MD5'];
    if (insecureAlgorithms.some(alg => analysis.name.includes(alg))) {
      analysis.vulnerabilities.push({
        type: 'insecure_algorithm',
        severity: 'high',
        message: 'Algoritmo de criptografia inseguro',
        impact: 'Vulnerável a ataques criptográficos'
      });
    }

    return analysis;
  }

  /**
   * Analisa extensões do certificado
   * @private
   */
  _analyzeExtensions(cert) {
    const extensions = {
      subjectAltName: null,
      keyUsage: null,
      extKeyUsage: null,
      basicConstraints: null,
      crlDistributionPoints: null,
      authorityInfoAccess: null,
      vulnerabilities: []
    };

    if (!cert.ext_key_usage && !cert.subject_alt_name) {
      extensions.vulnerabilities.push({
        type: 'missing_extensions',
        severity: 'medium',
        message: 'Extensões importantes do certificado ausentes'
      });
    }

    // Analisar Subject Alternative Name
    if (cert.subjectaltname) {
      extensions.subjectAltName = cert.subjectaltname.split(', ');
    }

    return extensions;
  }

  /**
   * Analisa cadeia de certificados
   * @private
   */
  _analyzeChain(cert) {
    const chain = {
      length: 0,
      isComplete: false,
      intermediates: [],
      root: null,
      vulnerabilities: []
    };

    if (cert.issuerCertificate && cert.issuerCertificate !== cert) {
      chain.length = this._calculateChainLength(cert);
      chain.isComplete = this._isChainComplete(cert);
      
      if (!chain.isComplete) {
        chain.vulnerabilities.push({
          type: 'incomplete_chain',
          severity: 'medium',
          message: 'Cadeia de certificados incompleta',
          impact: 'Alguns navegadores podem mostrar avisos'
        });
      }
    }

    return chain;
  }

  /**
   * Calcula o score SSL baseado nos componentes
   * @private
   */
  _calculateSSLScore(analysis) {
    let score = 100;

    // Score base mais alto para certificados válidos
    if (!analysis.isValid) {
      score = 30; // Certificados inválidos já começam baixo
    }

    // Penalizar MENOS por problemas menores (ser mais inteligente)
    analysis.vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 25; // Reduzido de 30
          break;
        case 'high':
          score -= 15; // Reduzido de 20
          break;
        case 'medium':
          score -= 8; // Reduzido de 10
          break;
        case 'low':
          score -= 3; // Reduzido de 5
          break;
        case 'warning':
          score -= 2; // Novo: avisos têm impacto mínimo
          break;
      }
    });

    // Penalizar componentes inseguros com menos severidade
    if (analysis.certificate.vulnerabilities) {
      analysis.certificate.vulnerabilities.forEach(vuln => {
        if (vuln.severity === 'critical') score -= 20; // Reduzido de 25
        else if (vuln.severity === 'high') score -= 12; // Reduzido de 15
        else if (vuln.severity === 'medium') score -= 6; // Reduzido de 8
        else if (vuln.severity === 'warning') score -= 2; // Avisos têm pouco impacto
      });
    }

    if (analysis.protocol.vulnerabilities) {
      analysis.protocol.vulnerabilities.forEach(vuln => {
        if (vuln.severity === 'critical') score -= 20;
        else if (vuln.severity === 'high') score -= 12;
        else if (vuln.severity === 'medium') score -= 6;
      });
    }

    if (analysis.cipher.vulnerabilities) {
      analysis.cipher.vulnerabilities.forEach(vuln => {
        if (vuln.severity === 'critical') score -= 20;
        else if (vuln.severity === 'high') score -= 12;
        else if (vuln.severity === 'medium') score -= 6;
      });
    }

    // Bonificar configurações boas
    if (analysis.protocol.version && analysis.protocol.version.includes('1.3')) {
      score += 5; // Bonus para TLS 1.3
    }
    
    if (analysis.cipher.bits >= 256) {
      score += 3; // Bonus para cipher forte
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Gera recomendações baseadas na análise
   * @private
   */
  _generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.score < 70) {
      recommendations.push('Configuração SSL necessita melhorias urgentes');
    }

    if (!analysis.isValid) {
      recommendations.push('Corrija os problemas de certificado');
    }

    if (analysis.protocol.version && !analysis.protocol.version.includes('1.2') && !analysis.protocol.version.includes('1.3')) {
      recommendations.push('Atualize para TLS 1.2 ou superior');
    }

    if (analysis.cipher.bits < 256) {
      recommendations.push('Use ciphers com pelo menos 256 bits');
    }

    return recommendations;
  }

  /**
   * Trata erros de SSL
   * @private
   */
  _handleSSLError(error) {
    let userMessage = 'Erro na análise SSL';
    let category = 'ssl_error';
    let severity = 'error';
    let recommendations = [];
    
    // Categorizar erros SSL específicos
    if (error.message.includes('timeout')) {
      userMessage = 'Timeout na conexão SSL';
      category = 'ssl_timeout';
      severity = 'warning';
      recommendations = [
        'O servidor pode estar sobrecarregado',
        'Tente novamente em alguns minutos',
        'Verifique se o servidor suporta HTTPS na porta 443'
      ];
    } else if (error.message.includes('recusada') || error.message.includes('refused')) {
      userMessage = 'Servidor não aceita conexões SSL';
      category = 'ssl_refused';
      severity = 'high';
      recommendations = [
        'Verifique se o site realmente suporta HTTPS',
        'O servidor pode não ter SSL configurado',
        'Tente usar HTTP em vez de HTTPS'
      ];
    } else if (error.message.includes('alert') || error.message.includes('rejeitou')) {
      userMessage = 'Servidor SSL rejeitou a conexão';
      category = 'ssl_rejected';
      severity = 'medium';
      recommendations = [
        'O servidor pode ter configurações SSL restritivas',
        'Certificado pode estar mal configurado',
        'Servidor pode não suportar versões TLS modernas'
      ];
    } else if (error.message.includes('não encontrado') || error.message.includes('ENOTFOUND')) {
      userMessage = 'Servidor não encontrado';
      category = 'dns_error';
      severity = 'high';
      recommendations = [
        'Verifique se a URL está correta',
        'O domínio pode não existir',
        'Problemas de DNS podem estar ocorrendo'
      ];
    } else {
      // Erro genérico
      recommendations = [
        'Verifique se o site suporta HTTPS',
        'O certificado pode estar configurado incorretamente',
        'Tente novamente em alguns minutos'
      ];
    }

    return {
      isValid: false,
      error: userMessage,
      technicalError: error.message,
      category,
      severity,
      score: 0,
      recommendations,
      vulnerabilities: [{
        type: category,
        severity,
        message: userMessage,
        impact: 'Análise SSL não pôde ser concluída'
      }]
    };
  }

  /**
   * Extrai algoritmo de assinatura
   * @private
   */
  _extractSignatureAlgorithm(cert) {
    return cert.sigalg || 'unknown';
  }

  /**
   * Extrai tamanho da chave
   * @private
   */
  _extractKeySize(cert) {
    if (cert.bits) return cert.bits;
    if (cert.modulus) return cert.modulus.length * 4; // hex to bits
    return 0;
  }

  /**
   * Verifica se o algoritmo de hash é seguro
   * @private
   */
  _isSecureHashAlgorithm(algorithm) {
    return SECURE_HASH_ALGORITHMS.some(secure => 
      algorithm.toUpperCase().includes(secure)
    );
  }

  /**
   * Verifica se o tamanho da chave é seguro
   * @private
   */
  _isSecureKeySize(algorithm, keySize) {
    const alg = algorithm.toUpperCase();
    
    for (const [type, minSize] of Object.entries(MIN_KEY_SIZES)) {
      if (alg.includes(type)) {
        return keySize >= minSize;
      }
    }
    
    return keySize >= 2048; // Default minimum
  }

  /**
   * Extrai algoritmo da cipher
   * @private
   */
  _extractCipherAlgorithm(cipherName) {
    const parts = cipherName.split('-');
    return parts.find(part => 
      ['AES', 'CHACHA20', 'RC4', 'DES'].some(alg => part.includes(alg))
    ) || 'unknown';
  }

  /**
   * Extrai método de troca de chaves
   * @private
   */
  _extractKeyExchange(cipherName) {
    if (cipherName.includes('ECDHE')) return 'ECDHE';
    if (cipherName.includes('DHE')) return 'DHE';
    if (cipherName.includes('RSA')) return 'RSA';
    return 'unknown';
  }

  /**
   * Extrai método de autenticação
   * @private
   */
  _extractAuthentication(cipherName) {
    if (cipherName.includes('ECDSA')) return 'ECDSA';
    if (cipherName.includes('RSA')) return 'RSA';
    if (cipherName.includes('DSS')) return 'DSS';
    return 'unknown';
  }

  /**
   * Calcula comprimento da cadeia de certificados
   * @private
   */
  _calculateChainLength(cert, count = 1) {
    if (cert.issuerCertificate && cert.issuerCertificate !== cert) {
      return this._calculateChainLength(cert.issuerCertificate, count + 1);
    }
    return count;
  }

  /**
   * Verifica se a cadeia está completa
   * @private
   */
  _isChainComplete(cert) {
    let current = cert;
    while (current.issuerCertificate && current.issuerCertificate !== current) {
      current = current.issuerCertificate;
    }
    // Se chegou a um certificado auto-assinado, a cadeia está completa
    return current.subject && current.issuer && 
           JSON.stringify(current.subject) === JSON.stringify(current.issuer);
  }
}

module.exports = new SSLAnalyzer();
