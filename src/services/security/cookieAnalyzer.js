const setCookie = require('set-cookie-parser');
const { COOKIE_SECURITY } = require('../../config/security');
const logger = require('../../utils/logger');

/**
 * Analisador avançado de segurança de cookies
 */
class CookieAnalyzer {

  /**
   * Analisa todos os cookies de uma resposta HTTP
   * @param {Array|string} cookieHeaders - Headers Set-Cookie
   * @param {string} url - URL de origem
   * @returns {Object} - Análise completa dos cookies
   */
  analyzeCookies(cookieHeaders, url) {
    const startTime = Date.now();
    
    try {
      if (!cookieHeaders || cookieHeaders.length === 0) {
        return {
          url,
          hasCookies: false,
          count: 0,
          score: 100, // Sem cookies = sem problemas de cookie
          grade: 'A',
          message: 'Nenhum cookie encontrado',
          recommendation: 'Se o site usar autenticação, considere implementar cookies seguros'
        };
      }

      // Parsear cookies
      const cookies = setCookie.parse(cookieHeaders);
      
      const analysis = {
        url,
        hasCookies: true,
        count: cookies.length,
        cookies: [],
        vulnerabilities: [],
        recommendations: [],
        score: 0,
        grade: 'F',
        summary: {
          secure: 0,
          httpOnly: 0,
          sameSite: 0,
          withExpiration: 0,
          sessionCookies: 0,
          persistent: 0
        }
      };

      // Analisar cada cookie individualmente
      for (const cookie of cookies) {
        const cookieAnalysis = this._analyzeSingleCookie(cookie, url);
        analysis.cookies.push(cookieAnalysis);

        // Atualizar sumário
        if (cookieAnalysis.secure) analysis.summary.secure++;
        if (cookieAnalysis.httpOnly) analysis.summary.httpOnly++;
        if (cookieAnalysis.sameSite) analysis.summary.sameSite++;
        if (cookieAnalysis.hasExpiration) analysis.summary.withExpiration++;
        if (cookieAnalysis.isSession) analysis.summary.sessionCookies++;
        if (cookieAnalysis.isPersistent) analysis.summary.persistent++;

        // Adicionar vulnerabilidades encontradas
        analysis.vulnerabilities.push(...cookieAnalysis.vulnerabilities);
      }

      // Analisar padrões gerais dos cookies
      this._analyzeOverallCookiePatterns(analysis);

      // Calcular score e grade
      analysis.score = this._calculateCookieScore(analysis);
      analysis.grade = this._calculateGrade(analysis.score);

      // Gerar recomendações
      analysis.recommendations = this._generateRecommendations(analysis);

      const duration = Date.now() - startTime;
      logger.performance('cookie_analysis', duration, { 
        url, 
        cookieCount: cookies.length, 
        score: analysis.score 
      });

      return analysis;

    } catch (error) {
      logger.errorWithContext(error, { url });
      return this._handleAnalysisError(error, url);
    }
  }

  /**
   * Analisa um cookie individual
   * @private
   */
  _analyzeSingleCookie(cookie, url) {
    const analysis = {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      secure: !!cookie.secure,
      httpOnly: !!cookie.httpOnly,
      sameSite: cookie.sameSite || null,
      maxAge: cookie.maxAge,
      expires: cookie.expires,
      hasExpiration: !!(cookie.maxAge || cookie.expires),
      isSession: !(cookie.maxAge || cookie.expires),
      isPersistent: !!(cookie.maxAge || cookie.expires),
      vulnerabilities: [],
      recommendations: [],
      securityLevel: 'insecure',
      explanation: this._explainCookie(cookie.name)
    };

    // Verificar se o nome é sensível
    const isSensitive = this._isSensitiveCookie(cookie.name);
    analysis.isSensitive = isSensitive;

    // Analisar flag Secure
    if (!analysis.secure) {
      const severity = isSensitive ? 'critical' : 'high';
      analysis.vulnerabilities.push({
        type: 'missing_secure_flag',
        severity,
        message: 'Cookie sem flag Secure',
        impact: 'Cookie pode ser transmitido via HTTP não criptografado',
        solution: 'Adicione a flag Secure ao cookie'
      });
    }

    // Analisar flag HttpOnly
    if (!analysis.httpOnly) {
      const severity = isSensitive ? 'high' : 'medium';
      analysis.vulnerabilities.push({
        type: 'missing_httponly_flag',
        severity,
        message: 'Cookie sem flag HttpOnly',
        impact: 'Cookie acessível via JavaScript (vulnerável a XSS)',
        solution: 'Adicione a flag HttpOnly ao cookie'
      });
    }

    // Analisar SameSite
    if (!analysis.sameSite) {
      analysis.vulnerabilities.push({
        type: 'missing_samesite',
        severity: 'medium',
        message: 'Cookie sem atributo SameSite',
        impact: 'Vulnerável a ataques CSRF',
        solution: 'Configure SameSite como Strict, Lax ou None conforme necessário'
      });
    } else if (analysis.sameSite.toLowerCase() === 'none' && !analysis.secure) {
      analysis.vulnerabilities.push({
        type: 'samesite_none_without_secure',
        severity: 'high',
        message: 'SameSite=None sem flag Secure',
        impact: 'Configuração inválida, cookie será rejeitado por navegadores modernos',
        solution: 'Adicione flag Secure quando usar SameSite=None'
      });
    }

    // Analisar duração
    if (analysis.isPersistent) {
      const duration = this._calculateCookieDuration(cookie);
      analysis.duration = duration;

      if (duration > COOKIE_SECURITY.maxAge) {
        analysis.vulnerabilities.push({
          type: 'excessive_cookie_lifetime',
          severity: 'medium',
          message: `Cookie com duração excessiva: ${Math.round(duration / (1000 * 60 * 60 * 24))} dias`,
          impact: 'Aumenta janela de oportunidade para ataques',
          solution: 'Reduza a duração do cookie para o mínimo necessário'
        });
      }
    }

    // Analisar valor do cookie
    this._analyzeCookieValue(analysis);

    // Analisar domínio e path
    this._analyzeCookieScope(analysis, url);

    // Determinar nível de segurança geral
    analysis.securityLevel = this._determineCookieSecurityLevel(analysis);

    return analysis;
  }

  /**
   * Analisa padrões gerais dos cookies
   * @private
   */
  _analyzeOverallCookiePatterns(analysis) {
    const { cookies, summary } = analysis;

    // Verificar se há muitos cookies
    if (cookies.length > 10) {
      analysis.vulnerabilities.push({
        type: 'excessive_cookies',
        severity: 'low',
        message: `Muitos cookies: ${cookies.length}`,
        impact: 'Pode afetar performance e privacidade',
        solution: 'Revise a necessidade de todos os cookies'
      });
    }

    // Verificar proporção de cookies seguros
    const secureRatio = summary.secure / cookies.length;
    if (secureRatio < 0.8) {
      analysis.vulnerabilities.push({
        type: 'low_secure_cookie_ratio',
        severity: 'high',
        message: `Apenas ${Math.round(secureRatio * 100)}% dos cookies têm flag Secure`,
        impact: 'Múltiplos cookies vulneráveis a interceptação',
        solution: 'Adicione flag Secure a todos os cookies'
      });
    }

    // Verificar HttpOnly
    const httpOnlyRatio = summary.httpOnly / cookies.length;
    if (httpOnlyRatio < 0.6) {
      analysis.vulnerabilities.push({
        type: 'low_httponly_ratio',
        severity: 'medium',
        message: `Apenas ${Math.round(httpOnlyRatio * 100)}% dos cookies têm flag HttpOnly`,
        impact: 'Múltiplos cookies vulneráveis a acesso via JavaScript',
        solution: 'Adicione flag HttpOnly aos cookies que não precisam ser acessados via JS'
      });
    }

    // Verificar cookies de sessão vs persistentes
    if (summary.sessionCookies === 0 && summary.persistent > 0) {
      analysis.vulnerabilities.push({
        type: 'no_session_cookies',
        severity: 'low',
        message: 'Apenas cookies persistentes detectados',
        impact: 'Dados ficam armazenados mesmo após fechar o navegador',
        solution: 'Considere usar cookies de sessão quando apropriado'
      });
    }

    // Verificar tracking cookies suspeitos
    const trackingCookies = cookies.filter(c => this._isTrackingCookie(c.name));
    if (trackingCookies.length > 0) {
      analysis.vulnerabilities.push({
        type: 'tracking_cookies_detected',
        severity: 'info',
        message: `${trackingCookies.length} possível(is) cookie(s) de tracking detectado(s)`,
        impact: 'Pode afetar privacidade dos usuários',
        solution: 'Certifique-se de ter consentimento adequado para cookies de tracking'
      });
    }
  }

  /**
   * Analisa o valor do cookie
   * @private
   */
  _analyzeCookieValue(analysis) {
    const value = analysis.value;

    // Verificar se parece estar codificado/criptografado
    if (this._isEncodedValue(value)) {
      analysis.isEncoded = true;
      analysis.recommendations.push('Valor aparenta estar codificado - boa prática');
    } else {
      analysis.isEncoded = false;
      if (analysis.isSensitive) {
        analysis.vulnerabilities.push({
          type: 'unencoded_sensitive_cookie',
          severity: 'medium',
          message: 'Cookie sensível com valor não codificado',
          impact: 'Informações sensíveis podem ser facilmente lidas',
          solution: 'Codifique ou criptografe valores de cookies sensíveis'
        });
      }
    }

    // Verificar tamanho do valor
    if (value.length > 4096) {
      analysis.vulnerabilities.push({
        type: 'oversized_cookie',
        severity: 'low',
        message: `Cookie muito grande: ${value.length} caracteres`,
        impact: 'Pode afetar performance e compatibilidade',
        solution: 'Reduza o tamanho do cookie ou use storage alternativo'
      });
    }

    // Verificar caracteres suspeitos
    if (/[<>\"'&]/.test(value)) {
      analysis.vulnerabilities.push({
        type: 'suspicious_characters',
        severity: 'low',
        message: 'Cookie contém caracteres potencialmente perigosos',
        impact: 'Pode indicar problemas de sanitização',
        solution: 'Sanitize e valide valores de cookies'
      });
    }
  }

  /**
   * Analisa escopo do cookie (domínio e path)
   * @private
   */
  _analyzeCookieScope(analysis, url) {
    const urlObj = new URL(url);

    // Analisar domínio
    if (analysis.domain) {
      if (analysis.domain.startsWith('.')) {
        analysis.isWildcardDomain = true;
        analysis.recommendations.push('Cookie com domínio wildcard - verifique se é necessário');
      }

      // Verificar se domínio é muito amplo
      const domainParts = analysis.domain.replace(/^\./, '').split('.');
      if (domainParts.length <= 2) {
        analysis.vulnerabilities.push({
          type: 'overly_broad_domain',
          severity: 'low',
          message: 'Domínio do cookie muito amplo',
          impact: 'Cookie compartilhado com mais subdomínios que necessário',
          solution: 'Use domínio mais específico quando possível'
        });
      }
    }

    // Analisar path
    if (analysis.path === '/') {
      analysis.isBroadPath = true;
      if (analysis.isSensitive) {
        analysis.vulnerabilities.push({
          type: 'broad_path_sensitive_cookie',
          severity: 'medium',
          message: 'Cookie sensível com path muito amplo',
          impact: 'Cookie enviado para todas as páginas do site',
          solution: 'Use path mais específico para cookies sensíveis'
        });
      }
    }
  }

  /**
   * Determina o nível de segurança geral do cookie
   * @private
   */
  _determineCookieSecurityLevel(analysis) {
    const hasSecure = analysis.secure;
    const hasHttpOnly = analysis.httpOnly;
    const hasSameSite = !!analysis.sameSite;
    const criticalVulns = analysis.vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = analysis.vulnerabilities.filter(v => v.severity === 'high').length;

    if (criticalVulns > 0) {
      return 'critical';
    } else if (highVulns > 0) {
      return 'insecure';
    } else if (hasSecure && hasHttpOnly && hasSameSite) {
      return 'secure';
    } else if (hasSecure && hasHttpOnly) {
      return 'moderate';
    } else {
      return 'insecure';
    }
  }

  /**
   * Calcula score baseado na análise dos cookies
   * @private
   */
  _calculateCookieScore(analysis) {
    if (!analysis.hasCookies) return 100;

    let score = 100;
    const { cookies, vulnerabilities } = analysis;

    // Penalizar por vulnerabilidades
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
        case 'info':
          score -= 2;
          break;
      }
    }

    // Bonificar por boas práticas
    const secureRatio = analysis.summary.secure / cookies.length;
    const httpOnlyRatio = analysis.summary.httpOnly / cookies.length;
    const sameSiteRatio = analysis.summary.sameSite / cookies.length;

    score += (secureRatio * 10);
    score += (httpOnlyRatio * 10);
    score += (sameSiteRatio * 5);

    return Math.max(0, Math.min(100, Math.round(score)));
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

    if (!analysis.hasCookies) {
      return ['Se implementar cookies, use as flags Secure, HttpOnly e SameSite'];
    }

    // Recomendações baseadas em problemas críticos
    const criticalVulns = analysis.vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      recommendations.push('CRÍTICO: Corrija imediatamente os problemas de segurança dos cookies');
    }

    // Recomendações baseadas no score
    if (analysis.score < 50) {
      recommendations.push('Configuração de cookies inadequada - revisão urgente necessária');
    } else if (analysis.score < 70) {
      recommendations.push('Configuração de cookies precisa de melhorias significativas');
    } else if (analysis.score < 90) {
      recommendations.push('Boa configuração de cookies, algumas otimizações possíveis');
    }

    // Recomendações específicas
    if (analysis.summary.secure < analysis.count) {
      recommendations.push('Adicione a flag Secure a todos os cookies');
    }

    if (analysis.summary.httpOnly < analysis.count * 0.8) {
      recommendations.push('Adicione a flag HttpOnly aos cookies que não precisam ser acessados via JavaScript');
    }

    if (analysis.summary.sameSite < analysis.count * 0.5) {
      recommendations.push('Configure o atributo SameSite para todos os cookies');
    }

    return [...new Set(recommendations)]; // Remove duplicatas
  }

  /**
   * Verifica se o cookie é sensível baseado no nome
   * @private
   */
  _isSensitiveCookie(name) {
    const sensitivePattermns = [
      /session/i, /auth/i, /token/i, /csrf/i, /password/i,
      /login/i, /user/i, /admin/i, /secure/i, /private/i,
      /jwt/i, /bearer/i, /oauth/i, /api[_-]?key/i
    ];

    return sensitivePattermns.some(pattern => pattern.test(name)) ||
           COOKIE_SECURITY.dangerousNames.some(dangerous => 
             name.toLowerCase().includes(dangerous)
           );
  }

  /**
   * Verifica se é um cookie de tracking
   * @private
   */
  _isTrackingCookie(name) {
    const trackingPatterns = [
      /^_ga/i, /^_gtm/i, /^_gid/i, /^_fbp/i, /^_fbc/i,
      /track/i, /analytics/i, /pixel/i, /campaign/i,
      /utm_/i, /visitor/i, /affiliate/i
    ];

    return trackingPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Verifica se o valor parece estar codificado
   * @private
   */
  _isEncodedValue(value) {
    // Verificar se parece base64, hex, ou outro encoding
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    const hexPattern = /^[0-9a-fA-F]+$/;
    const hasRandomChars = /[A-Za-z0-9]{20,}/.test(value);
    
    return (
      (base64Pattern.test(value) && value.length > 10) ||
      (hexPattern.test(value) && value.length > 16) ||
      hasRandomChars
    );
  }

  /**
   * Calcula duração do cookie em milissegundos
   * @private
   */
  _calculateCookieDuration(cookie) {
    if (cookie.maxAge) {
      return cookie.maxAge * 1000; // maxAge é em segundos
    } else if (cookie.expires) {
      const expiresDate = new Date(cookie.expires);
      const now = new Date();
      return expiresDate.getTime() - now.getTime();
    }
    return 0;
  }

  /**
   * Explica a função do cookie baseado no nome
   * @private
   */
  _explainCookie(name) {
    const explanations = {
      'PHPSESSID': 'Cookie de sessão do PHP para identificar usuários únicos',
      'JSESSIONID': 'Cookie de sessão usado em servidores Java',
      'ASP.NET_SessionId': 'Cookie de sessão para aplicações ASP.NET',
      'csrftoken': 'Token usado para proteção contra ataques CSRF',
      'SID': 'Identificador de sessão genérico',
      'NID': 'Cookie usado pelo Google para personalizar anúncios',
      '_ga': 'Cookie do Google Analytics para identificar usuários únicos',
      '_gid': 'Cookie do Google Analytics para identificar usuários em 24h',
      '_fbp': 'Cookie do Facebook Pixel para tracking',
      '_session_id': 'Identificador de sessão da aplicação'
    };

    // Busca exata
    if (explanations[name]) {
      return explanations[name];
    }

    // Busca por padrões
    if (/session/i.test(name)) {
      return 'Cookie relacionado ao gerenciamento de sessão do usuário';
    } else if (/auth|login/i.test(name)) {
      return 'Cookie relacionado à autenticação do usuário';
    } else if (/csrf|token/i.test(name)) {
      return 'Token de segurança para proteção contra ataques';
    } else if (/cart|basket/i.test(name)) {
      return 'Cookie para gerenciar carrinho de compras';
    } else if (/lang|locale/i.test(name)) {
      return 'Cookie para armazenar preferência de idioma';
    } else if (/theme|style/i.test(name)) {
      return 'Cookie para armazenar preferências visuais';
    } else if (/_ga|_gtm|analytics/i.test(name)) {
      return 'Cookie usado para análise e estatísticas do site';
    } else if (/_fb|facebook/i.test(name)) {
      return 'Cookie relacionado a funcionalidades do Facebook';
    } else {
      return 'Cookie genérico utilizado para diversas funções no site';
    }
  }

  /**
   * Trata erros na análise
   * @private
   */
  _handleAnalysisError(error, url) {
    return {
      url,
      error: 'Erro na análise de cookies',
      message: error.message,
      hasCookies: false,
      count: 0,
      score: 0,
      grade: 'F',
      recommendations: ['Erro interno - tente novamente']
    };
  }
}

module.exports = new CookieAnalyzer();
