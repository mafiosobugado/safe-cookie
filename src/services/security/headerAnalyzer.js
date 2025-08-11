const { SECURITY_HEADERS } = require('../../config/security');
const logger = require('../../utils/logger');

/**
 * Analisador avançado de headers de segurança HTTP
 */
class HeaderAnalyzer {

  /**
   * Analisa os headers de segurança de uma resposta HTTP
   * @param {Object} headers - Headers da resposta HTTP
   * @param {string} url - URL analisada
   * @returns {Object} - Análise completa dos headers
   */
  analyzeHeaders(headers, url) {
    const startTime = Date.now();
    
    try {
      const normalizedHeaders = this._normalizeHeaders(headers);
      const analysis = {
        url,
        timestamp: new Date().toISOString(),
        score: 0,
        grade: 'F',
        present: [],
        missing: [],
        vulnerabilities: [],
        recommendations: [],
        details: {}
      };

      // Analisar cada header de segurança
      for (const [headerName, config] of Object.entries(SECURITY_HEADERS)) {
        const headerValue = normalizedHeaders[headerName.toLowerCase()];
        
        if (headerValue) {
          analysis.present.push(headerName);
          analysis.details[headerName] = this._analyzeSpecificHeader(headerName, headerValue, url);
        } else {
          analysis.missing.push(headerName);
          analysis.vulnerabilities.push({
            type: 'missing_header',
            header: headerName,
            severity: config.severity,
            message: `Header ${headerName} ausente`,
            description: config.description,
            impact: this._getHeaderImpact(headerName),
            weight: config.weight
          });
        }
      }

      // Analisar headers adicionais interessantes
      analysis.additionalHeaders = this._analyzeAdditionalHeaders(normalizedHeaders);

      // Calcular score e grade
      analysis.score = this._calculateSecurityScore(analysis);
      analysis.grade = this._calculateGrade(analysis.score);

      // Gerar recomendações
      analysis.recommendations = this._generateRecommendations(analysis);

      const duration = Date.now() - startTime;
      logger.performance('header_analysis', duration, { url, score: analysis.score });

      return analysis;

    } catch (error) {
      logger.errorWithContext(error, { url });
      return this._handleAnalysisError(error, url);
    }
  }

  /**
   * Normaliza headers para análise consistente
   * @private
   */
  _normalizeHeaders(headers) {
    const normalized = {};
    
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    }
    
    return normalized;
  }

  /**
   * Analisa um header específico em detalhes
   * @private
   */
  _analyzeSpecificHeader(headerName, headerValue, url) {
    const analysis = {
      value: headerValue,
      isPresent: true,
      isConfigured: false,
      vulnerabilities: [],
      recommendations: [],
      score: 0
    };

    switch (headerName.toLowerCase()) {
      case 'content-security-policy':
        return this._analyzeCSP(headerValue, analysis);
      
      case 'strict-transport-security':
        return this._analyzeHSTS(headerValue, analysis);
      
      case 'x-frame-options':
        return this._analyzeXFrameOptions(headerValue, analysis);
      
      case 'x-content-type-options':
        return this._analyzeXContentTypeOptions(headerValue, analysis);
      
      case 'referrer-policy':
        return this._analyzeReferrerPolicy(headerValue, analysis);
      
      case 'permissions-policy':
        return this._analyzePermissionsPolicy(headerValue, analysis);
      
      case 'x-xss-protection':
        return this._analyzeXSSProtection(headerValue, analysis);
      
      case 'cache-control':
        return this._analyzeCacheControl(headerValue, analysis);
      
      default:
        analysis.isConfigured = true;
        analysis.score = 50; // Score básico para headers presentes
        return analysis;
    }
  }

  /**
   * Analisa Content Security Policy
   * @private
   */
  _analyzeCSP(value, analysis) {
    const directives = this._parseCSPDirectives(value);
    analysis.directives = directives;
    analysis.isConfigured = true;

    // Verificar diretivas importantes
    const criticalDirectives = ['default-src', 'script-src', 'object-src'];
    const missingCritical = criticalDirectives.filter(dir => !directives[dir]);

    if (missingCritical.length > 0) {
      analysis.vulnerabilities.push({
        type: 'missing_csp_directives',
        severity: 'high',
        message: `Diretivas CSP críticas ausentes: ${missingCritical.join(', ')}`,
        impact: 'Proteção incompleta contra XSS'
      });
    }

    // Verificar uso de 'unsafe-inline' e 'unsafe-eval'
    const unsafeUsage = [];
    for (const [directive, sources] of Object.entries(directives)) {
      if (sources.includes("'unsafe-inline'")) {
        unsafeUsage.push(`${directive}: unsafe-inline`);
      }
      if (sources.includes("'unsafe-eval'")) {
        unsafeUsage.push(`${directive}: unsafe-eval`);
      }
    }

    if (unsafeUsage.length > 0) {
      analysis.vulnerabilities.push({
        type: 'unsafe_csp_directives',
        severity: 'medium',
        message: `Uso de diretivas inseguras: ${unsafeUsage.join(', ')}`,
        impact: 'Reduz eficácia da proteção CSP'
      });
    }

    // Verificar wildcard em script-src
    if (directives['script-src'] && directives['script-src'].includes('*')) {
      analysis.vulnerabilities.push({
        type: 'csp_wildcard_script',
        severity: 'high',
        message: 'Wildcard (*) em script-src',
        impact: 'Permite execução de scripts de qualquer origem'
      });
    }

    analysis.score = Math.max(20, 100 - (analysis.vulnerabilities.length * 20));
    return analysis;
  }

  /**
   * Analisa Strict Transport Security
   * @private
   */
  _analyzeHSTS(value, analysis) {
    analysis.isConfigured = true;
    const hstsParams = this._parseHSTSParams(value);
    analysis.params = hstsParams;

    // Verificar max-age
    if (!hstsParams.maxAge || hstsParams.maxAge < 31536000) { // 1 ano
      analysis.vulnerabilities.push({
        type: 'hsts_short_max_age',
        severity: 'medium',
        message: `Max-age muito baixo: ${hstsParams.maxAge || 0} segundos`,
        impact: 'HSTS pode não ser efetivo para proteção a longo prazo'
      });
    }

    // Verificar includeSubDomains
    if (!hstsParams.includeSubDomains) {
      analysis.recommendations.push('Considere adicionar includeSubDomains para proteger subdomínios');
    }

    // Verificar preload
    if (!hstsParams.preload) {
      analysis.recommendations.push('Considere adicionar preload para inclusão na lista de preload dos navegadores');
    }

    analysis.score = 60 + (hstsParams.includeSubDomains ? 20 : 0) + (hstsParams.preload ? 20 : 0);
    return analysis;
  }

  /**
   * Analisa X-Frame-Options
   * @private
   */
  _analyzeXFrameOptions(value, analysis) {
    analysis.isConfigured = true;
    const normalizedValue = value.toLowerCase();

    if (normalizedValue === 'deny') {
      analysis.score = 100;
      analysis.level = 'strict';
    } else if (normalizedValue === 'sameorigin') {
      analysis.score = 90;
      analysis.level = 'moderate';
    } else if (normalizedValue.startsWith('allow-from')) {
      analysis.score = 70;
      analysis.level = 'permissive';
      analysis.vulnerabilities.push({
        type: 'deprecated_allow_from',
        severity: 'low',
        message: 'ALLOW-FROM é obsoleto, use CSP frame-ancestors',
        impact: 'Não suportado por navegadores modernos'
      });
    } else {
      analysis.score = 30;
      analysis.vulnerabilities.push({
        type: 'invalid_x_frame_options',
        severity: 'medium',
        message: `Valor inválido: ${value}`,
        impact: 'Header não oferece proteção'
      });
    }

    return analysis;
  }

  /**
   * Analisa X-Content-Type-Options
   * @private
   */
  _analyzeXContentTypeOptions(value, analysis) {
    analysis.isConfigured = true;
    
    if (value.toLowerCase() === 'nosniff') {
      analysis.score = 100;
      analysis.level = 'secure';
    } else {
      analysis.score = 30;
      analysis.vulnerabilities.push({
        type: 'invalid_x_content_type_options',
        severity: 'medium',
        message: `Valor deve ser 'nosniff', encontrado: ${value}`,
        impact: 'Não previne MIME sniffing'
      });
    }

    return analysis;
  }

  /**
   * Analisa Referrer Policy
   * @private
   */
  _analyzeReferrerPolicy(value, analysis) {
    analysis.isConfigured = true;
    const validPolicies = [
      'no-referrer', 'no-referrer-when-downgrade', 'origin', 
      'origin-when-cross-origin', 'same-origin', 'strict-origin', 
      'strict-origin-when-cross-origin', 'unsafe-url'
    ];

    const policies = value.split(',').map(p => p.trim().toLowerCase());
    analysis.policies = policies;

    const invalidPolicies = policies.filter(p => !validPolicies.includes(p));
    if (invalidPolicies.length > 0) {
      analysis.vulnerabilities.push({
        type: 'invalid_referrer_policy',
        severity: 'low',
        message: `Políticas inválidas: ${invalidPolicies.join(', ')}`,
        impact: 'Pode não funcionar como esperado'
      });
    }

    // Avaliar nível de privacidade
    if (policies.includes('no-referrer') || policies.includes('strict-origin')) {
      analysis.score = 100;
      analysis.privacyLevel = 'high';
    } else if (policies.includes('origin') || policies.includes('strict-origin-when-cross-origin')) {
      analysis.score = 80;
      analysis.privacyLevel = 'medium';
    } else {
      analysis.score = 60;
      analysis.privacyLevel = 'low';
    }

    return analysis;
  }

  /**
   * Analisa Permissions Policy
   * @private
   */
  _analyzePermissionsPolicy(value, analysis) {
    analysis.isConfigured = true;
    const policies = this._parsePermissionsPolicy(value);
    analysis.policies = policies;

    // Verificar políticas importantes
    const importantFeatures = ['camera', 'microphone', 'geolocation', 'payment'];
    const configuredFeatures = Object.keys(policies);
    const missingImportant = importantFeatures.filter(f => !configuredFeatures.includes(f));

    if (missingImportant.length > 0) {
      analysis.recommendations.push(
        `Considere configurar políticas para: ${missingImportant.join(', ')}`
      );
    }

    analysis.score = Math.min(100, 40 + (configuredFeatures.length * 10));
    return analysis;
  }

  /**
   * Analisa X-XSS-Protection
   * @private
   */
  _analyzeXSSProtection(value, analysis) {
    analysis.isConfigured = true;
    
    // Header obsoleto, mas ainda relevante para navegadores antigos
    analysis.vulnerabilities.push({
      type: 'obsolete_header',
      severity: 'info',
      message: 'X-XSS-Protection é obsoleto, use CSP',
      impact: 'Substituído por Content Security Policy'
    });

    if (value === '1; mode=block') {
      analysis.score = 70;
      analysis.level = 'block';
    } else if (value === '1') {
      analysis.score = 50;
      analysis.level = 'filter';
    } else if (value === '0') {
      analysis.score = 20;
      analysis.level = 'disabled';
      analysis.vulnerabilities.push({
        type: 'xss_protection_disabled',
        severity: 'low',
        message: 'Proteção XSS desabilitada',
        impact: 'Não oferece proteção contra XSS em navegadores antigos'
      });
    } else {
      analysis.score = 30;
      analysis.vulnerabilities.push({
        type: 'invalid_xss_protection',
        severity: 'low',
        message: `Valor inválido: ${value}`,
        impact: 'Header não oferece proteção'
      });
    }

    return analysis;
  }

  /**
   * Analisa Cache-Control
   * @private
   */
  _analyzeCacheControl(value, analysis) {
    analysis.isConfigured = true;
    const directives = value.split(',').map(d => d.trim().toLowerCase());
    analysis.directives = directives;

    // Verificar diretivas de segurança
    const secureDirectives = ['no-store', 'no-cache', 'private'];
    const hasSecureDirective = secureDirectives.some(d => directives.includes(d));

    if (hasSecureDirective) {
      analysis.score = 80;
      analysis.level = 'secure';
    } else {
      analysis.score = 40;
      analysis.recommendations.push('Considere usar no-cache ou no-store para dados sensíveis');
    }

    return analysis;
  }

  /**
   * Analisa headers adicionais interessantes
   * @private
   */
  _analyzeAdditionalHeaders(headers) {
    const additional = {};

    // Server header
    if (headers['server']) {
      additional.server = {
        value: headers['server'],
        recommendation: 'Considere ocultar ou generalizar informações do servidor'
      };
    }

    // X-Powered-By header
    if (headers['x-powered-by']) {
      additional.xPoweredBy = {
        value: headers['x-powered-by'],
        vulnerability: {
          type: 'information_disclosure',
          severity: 'low',
          message: 'Header X-Powered-By revela tecnologia usada',
          impact: 'Facilita reconhecimento para ataques direcionados'
        }
      };
    }

    // Set-Cookie headers
    if (headers['set-cookie']) {
      additional.cookies = {
        count: Array.isArray(headers['set-cookie']) ? headers['set-cookie'].length : 1,
        recommendation: 'Cookies serão analisados separadamente'
      };
    }

    return additional;
  }

  /**
   * Calcula score de segurança baseado na análise
   * @private
   */
  _calculateSecurityScore(analysis) {
    let score = 0;
    const totalWeight = Object.values(SECURITY_HEADERS).reduce((sum, config) => sum + config.weight, 0);
    
    // Score base para sites com HTTPS (Google, sites grandes)
    if (analysis.url && analysis.url.startsWith('https://')) {
      score = 30; // Base score for HTTPS sites
    }

    // Pontos por headers presentes
    for (const headerName of analysis.present) {
      const config = SECURITY_HEADERS[headerName];
      const detail = analysis.details[headerName];
      
      if (config && detail) {
        // Score baseado na qualidade da configuração
        const headerScore = detail.score || 50;
        const weightedScore = (headerScore / 100) * config.weight;
        score += weightedScore;
      }
    }

    // Penalizar MENOS por headers ausentes (mais inteligente)
    for (const headerName of analysis.missing) {
      const config = SECURITY_HEADERS[headerName];
      
      // Ser mais inteligente sobre headers opcionais
      if (this._isOptionalHeader(headerName, analysis.url)) {
        continue; // Não penalizar headers que são opcionais para este tipo de site
      }
      
      if (config.severity === 'critical') {
        score -= config.weight * 0.3; // Penalidade reduzida
      } else if (config.severity === 'high') {
        score -= config.weight * 0.2;
      } else if (config.severity === 'medium') {
        score -= config.weight * 0.1;
      }
    }

    // Normalizar para 0-100
    const normalizedScore = Math.max(0, Math.min(100, (score / totalWeight) * 100));
    
    return Math.round(normalizedScore);
  }

  /**
   * Verifica se um header é opcional para um tipo de site
   * @private
   */
  _isOptionalHeader(headerName, url) {
    // Para sites grandes como Google, alguns headers são opcionais
    const majorSites = ['google.com', 'facebook.com', 'microsoft.com', 'amazon.com', 'apple.com'];
    const isMajorSite = majorSites.some(site => url && url.includes(site));
    
    if (isMajorSite) {
      // Headers que sites grandes podem optar por não usar
      const optionalForMajor = ['X-XSS-Protection', 'X-Frame-Options'];
      return optionalForMajor.includes(headerName);
    }
    
    // Headers que são geralmente opcionais
    const generallyOptional = ['Permissions-Policy', 'Referrer-Policy'];
    return generallyOptional.includes(headerName);
  }

  /**
   * Calcula grade baseada no score
   * @private
   */
  _calculateGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Gera recomendações baseadas na análise
   * @private
   */
  _generateRecommendations(analysis) {
    const recommendations = [];

    // Recomendações para headers ausentes (prioritários)
    const criticalMissing = analysis.missing.filter(header => 
      SECURITY_HEADERS[header]?.severity === 'critical'
    );

    if (criticalMissing.length > 0) {
      recommendations.push(`CRÍTICO: Implemente os headers: ${criticalMissing.join(', ')}`);
    }

    // Recomendações específicas dos headers presentes
    for (const headerName of analysis.present) {
      const detail = analysis.details[headerName];
      if (detail && detail.recommendations) {
        recommendations.push(...detail.recommendations);
      }
    }

    // Recomendações gerais baseadas no score
    if (analysis.score < 50) {
      recommendations.push('Configuração de segurança inadequada - revisão urgente necessária');
    } else if (analysis.score < 70) {
      recommendations.push('Configuração de segurança precisa de melhorias');
    } else if (analysis.score < 90) {
      recommendations.push('Boa configuração de segurança, algumas otimizações possíveis');
    }

    return [...new Set(recommendations)]; // Remove duplicatas
  }

  /**
   * Retorna impacto de um header ausente
   * @private
   */
  _getHeaderImpact(headerName) {
    const impacts = {
      'Content-Security-Policy': 'Site vulnerável a ataques XSS e injeção de código',
      'Strict-Transport-Security': 'Conexões HTTP não forçadas para HTTPS',
      'X-Frame-Options': 'Site pode ser incorporado em iframes maliciosos',
      'X-Content-Type-Options': 'Navegador pode interpretar incorretamente tipos de arquivo',
      'Referrer-Policy': 'Informações do referenciador podem vazar',
      'Permissions-Policy': 'Acesso irrestrito a APIs do navegador'
    };

    return impacts[headerName] || 'Redução na segurança geral';
  }

  /**
   * Parseia diretivas CSP
   * @private
   */
  _parseCSPDirectives(cspValue) {
    const directives = {};
    const parts = cspValue.split(';');

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const spaceIndex = trimmed.indexOf(' ');
      if (spaceIndex === -1) {
        directives[trimmed] = [];
      } else {
        const directive = trimmed.substring(0, spaceIndex);
        const sources = trimmed.substring(spaceIndex + 1).split(/\s+/);
        directives[directive] = sources;
      }
    }

    return directives;
  }

  /**
   * Parseia parâmetros HSTS
   * @private
   */
  _parseHSTSParams(hstsValue) {
    const params = {
      maxAge: 0,
      includeSubDomains: false,
      preload: false
    };

    const parts = hstsValue.split(';');
    
    for (const part of parts) {
      const trimmed = part.trim().toLowerCase();
      
      if (trimmed.startsWith('max-age=')) {
        params.maxAge = parseInt(trimmed.substring(8));
      } else if (trimmed === 'includesubdomains') {
        params.includeSubDomains = true;
      } else if (trimmed === 'preload') {
        params.preload = true;
      }
    }

    return params;
  }

  /**
   * Parseia Permissions Policy
   * @private
   */
  _parsePermissionsPolicy(value) {
    const policies = {};
    const directives = value.split(',');

    for (const directive of directives) {
      const trimmed = directive.trim();
      const equalIndex = trimmed.indexOf('=');
      
      if (equalIndex !== -1) {
        const feature = trimmed.substring(0, equalIndex);
        const allowlist = trimmed.substring(equalIndex + 1);
        policies[feature] = allowlist;
      }
    }

    return policies;
  }

  /**
   * Trata erros na análise
   * @private
   */
  _handleAnalysisError(error, url) {
    return {
      url,
      error: 'Erro na análise de headers',
      message: error.message,
      score: 0,
      grade: 'F',
      recommendations: ['Erro interno - tente novamente']
    };
  }
}

module.exports = new HeaderAnalyzer();
