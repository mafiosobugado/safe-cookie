const urlValidator = require('../services/network/urlValidator');
const httpClient = require('../services/network/httpClient');
const sslAnalyzer = require('../services/security/sslAnalyzer');
const headerAnalyzer = require('../services/security/headerAnalyzer');
const cookieAnalyzer = require('../services/security/cookieAnalyzer');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Controller para análises de segurança
 */
class AnalysisController {

  /**
   * Executa análise completa de uma URL
   */
  analyzeUrl = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    let { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: true,
        message: 'URL é obrigatória',
        code: 'MISSING_URL'
      });
    }

    logger.analysis(url, 'analysis_start');

    try {
      // Fase 1: Validação e normalização da URL
      const urlValidation = await urlValidator.validateAndNormalize(url);
      
      if (!urlValidation.isValid) {
        return res.status(400).json({
          error: true,
          message: 'URL inválida',
          details: urlValidation.errors,
          suggestions: urlValidation.suggestions,
          code: 'INVALID_URL'
        });
      }

      const validatedUrl = urlValidation.url;
      logger.analysis(validatedUrl, 'url_validated', { 
        originalUrl: url,
        isHttps: urlValidation.isHttps 
      });

      // Fase 2: Requisição HTTP
      const httpResponse = await httpClient.get(validatedUrl);
      logger.analysis(validatedUrl, 'http_response_received', { 
        status: httpResponse.status,
        size: httpResponse.size.total 
      });

      // Verificar se a resposta HTTP é utilizável
      if (httpResponse.status === 429) {
        return res.status(429).json({
          error: true,
          message: 'Site bloqueou muitas requisições',
          code: 'RATE_LIMITED',
          suggestions: ['Aguarde alguns minutos e tente novamente']
        });
      }

      if (httpResponse.status >= 500) {
        return res.status(500).json({
          error: true,
          message: 'Servidor do site está com problemas',
          code: 'SERVER_ERROR',
          suggestions: ['Tente novamente mais tarde']
        });
      }

      if (httpResponse.status >= 400) {
        return res.status(400).json({
          error: true,
          message: `Site retornou erro: ${httpResponse.status} ${httpResponse.statusText}`,
          code: 'HTTP_ERROR',
          suggestions: ['Verifique se a URL está correta']
        });
      }

      // Fase 3: Análises paralelas
      const analysisPromises = [
        this._analyzeSSL(validatedUrl, urlValidation.isHttps),
        this._analyzeHeaders(httpResponse.headers, validatedUrl),
        this._analyzeCookies(httpResponse.cookies, validatedUrl),
        this._analyzeHTML(httpResponse.data, validatedUrl)
      ];

      const [sslAnalysis, headerAnalysis, cookieAnalysis, htmlAnalysis] = 
        await Promise.allSettled(analysisPromises);

      // Consolidar resultados
      const analysis = {
        url: validatedUrl,
        originalUrl: url,
        timestamp: new Date().toISOString(),
        httpStatus: httpResponse.status,
        isHttps: urlValidation.isHttps,
        redirected: httpResponse.wasRedirected,
        finalUrl: httpResponse.finalUrl,
        
        ssl: this._processSettledResult(sslAnalysis, 'SSL'),
        headers: this._processSettledResult(headerAnalysis, 'Headers'),
        cookies: this._processSettledResult(cookieAnalysis, 'Cookies'),
        html: this._processSettledResult(htmlAnalysis, 'HTML'),
        
        vulnerabilities: [],
        recommendations: [],
        score: 0,
        grade: 'F'
      };

      // Consolidar vulnerabilidades e recomendações
      this._consolidateAnalysis(analysis);

      // Calcular score e grade finais
      analysis.score = this._calculateOverallScore(analysis);
      analysis.grade = this._calculateGrade(analysis.score);

      const duration = Date.now() - startTime;
      logger.performance('complete_analysis', duration, { 
        url: validatedUrl, 
        score: analysis.score,
        vulnerabilityCount: analysis.vulnerabilities.length
      });

      logger.analysis(validatedUrl, 'analysis_complete', { 
        score: analysis.score,
        grade: analysis.grade,
        duration 
      });

      // Responder sempre com JSON para rotas API
      if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
        res.json(analysis);
      } else {
        res.render('pages/analysis', { 
          analysis,
          title: 'Análise de Segurança',
          error: null
        });
      }

    } catch (error) {
      logger.errorWithContext(error, { url, duration: Date.now() - startTime });
      
      if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) {
        res.status(500).json({
          error: true,
          message: 'Erro na análise',
          details: error.message,
          code: 'ANALYSIS_ERROR'
        });
      } else {
        res.render('pages/analysis', {
          analysis: null,
          title: 'Análise de Segurança',
          error: {
            message: error.userMessage || 'Erro interno na análise',
            technical: error.message,
            suggestions: error.suggestions || ['Tente novamente em alguns minutos']
          }
        });
      }
    }
  });

  /**
   * Renderiza página inicial de análise
   */
  showAnalysisPage = asyncHandler(async (req, res) => {
    res.render('pages/analysis', {
      analysis: null,
      title: 'Safe Cookie - Análise de Segurança',
      error: null
    });
  });

  /**
   * Endpoint para verificar status de uma URL (health check rápido)
   */
  checkUrlStatus = asyncHandler(async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: true,
        message: 'URL é obrigatória'
      });
    }

    try {
      const urlValidation = await urlValidator.validateAndNormalize(url);
      
      if (!urlValidation.isValid) {
        return res.json({
          isValid: false,
          errors: urlValidation.errors,
          suggestions: urlValidation.suggestions
        });
      }

      const headResponse = await httpClient.head(urlValidation.url);
      
      res.json({
        isValid: true,
        isAvailable: headResponse.isAvailable,
        status: headResponse.status,
        isHttps: urlValidation.isHttps,
        normalizedUrl: urlValidation.normalizedUrl
      });

    } catch (error) {
      res.json({
        isValid: false,
        isAvailable: false,
        error: error.userMessage || 'Erro ao verificar URL'
      });
    }
  });

  /**
   * Analisa SSL se a URL usar HTTPS
   * @private
   */
  async _analyzeSSL(url, isHttps) {
    if (!isHttps) {
      return {
        isSecure: false,
        reason: 'URL não usa HTTPS',
        score: 0,
        recommendations: ['Use HTTPS para proteger a comunicação']
      };
    }

    return await sslAnalyzer.analyzeSSL(url);
  }

  /**
   * Analisa headers de segurança
   * @private
   */
  async _analyzeHeaders(headers, url) {
    return headerAnalyzer.analyzeHeaders(headers, url);
  }

  /**
   * Analisa cookies de segurança
   * @private
   */
  async _analyzeCookies(cookieHeaders, url) {
    return cookieAnalyzer.analyzeCookies(cookieHeaders, url);
  }

  /**
   * Analisa HTML para vulnerabilidades
   * @private
   */
  async _analyzeHTML(htmlContent, url) {
    // Implementação básica - pode ser expandida
    const cheerio = require('cheerio');
    const $ = cheerio.load(htmlContent);
    
    const analysis = {
      url,
      vulnerabilities: [],
      recommendations: [],
      forms: [],
      scripts: [],
      score: 80 // Score base para HTML
    };

    // Analisar formulários
    $('form').each((i, form) => {
      const $form = $(form);
      const method = $form.attr('method')?.toLowerCase() || 'get';
      const action = $form.attr('action') || '';
      const hasPasswordField = $form.find('input[type="password"]').length > 0;
      
      const formAnalysis = {
        method,
        action,
        hasPasswordField,
        isSecure: url.startsWith('https://'),
        vulnerabilities: []
      };

      // Verificar formulário com senha sem HTTPS
      if (hasPasswordField && !url.startsWith('https://')) {
        formAnalysis.vulnerabilities.push({
          type: 'form_password_no_https',
          severity: 'critical',
          message: 'Formulário com campo de senha sem HTTPS',
          impact: 'Senhas podem ser interceptadas'
        });
        analysis.score -= 20;
      }

      // Verificar método GET para senhas
      if (hasPasswordField && method === 'get') {
        formAnalysis.vulnerabilities.push({
          type: 'password_in_get',
          severity: 'critical',
          message: 'Campo de senha em formulário GET',
          impact: 'Senha aparecerá na URL e logs do servidor'
        });
        analysis.score -= 25;
      }

      analysis.forms.push(formAnalysis);
      analysis.vulnerabilities.push(...formAnalysis.vulnerabilities);
    });

    // Analisar scripts
    $('script').each((i, script) => {
      const $script = $(script);
      const src = $script.attr('src');
      
      if (src) {
        const scriptAnalysis = {
          src,
          isExternal: !src.startsWith('/') && !src.startsWith(url),
          isHttps: src.startsWith('https://'),
          vulnerabilities: []
        };

        // Script externo via HTTP
        if (scriptAnalysis.isExternal && !scriptAnalysis.isHttps && src.startsWith('http://')) {
          scriptAnalysis.vulnerabilities.push({
            type: 'script_http_external',
            severity: 'high',
            message: 'Script externo carregado via HTTP',
            impact: 'Script pode ser modificado por atacantes'
          });
          analysis.score -= 15;
        }

        analysis.scripts.push(scriptAnalysis);
        analysis.vulnerabilities.push(...scriptAnalysis.vulnerabilities);
      }
    });

    // Verificar meta tags de segurança
    const hasViewport = $('meta[name="viewport"]').length > 0;
    const hasCharset = $('meta[charset]').length > 0 || $('meta[http-equiv="Content-Type"]').length > 0;
    
    if (!hasCharset) {
      analysis.vulnerabilities.push({
        type: 'missing_charset',
        severity: 'low',
        message: 'Meta tag charset ausente',
        impact: 'Pode causar problemas de encoding'
      });
      analysis.score -= 5;
    }

    return analysis;
  }

  /**
   * Processa resultado de Promise.allSettled
   * @private
   */
  _processSettledResult(settledResult, category) {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      logger.errorWithContext(settledResult.reason, { category });
      return {
        error: true,
        category,
        message: `Erro na análise de ${category}`,
        score: 0,
        vulnerabilities: [{
          type: 'analysis_error',
          severity: 'error',
          message: `Falha na análise de ${category}: ${settledResult.reason.message}`
        }]
      };
    }
  }

  /**
   * Consolida todas as análises em uma estrutura unificada
   * @private
   */
  _consolidateAnalysis(analysis) {
    const { ssl, headers, cookies, html } = analysis;

    // Consolidar vulnerabilidades
    analysis.vulnerabilities = [
      ...(ssl.vulnerabilities || []),
      ...(headers.vulnerabilities || []),
      ...(cookies.vulnerabilities || []),
      ...(html.vulnerabilities || [])
    ];

    // Consolidar recomendações
    analysis.recommendations = [
      ...(ssl.recommendations || []),
      ...(headers.recommendations || []),
      ...(cookies.recommendations || []),
      ...(html.recommendations || [])
    ];

    // Remover duplicatas de recomendações
    analysis.recommendations = [...new Set(analysis.recommendations)];

    // Adicionar estatísticas
    analysis.stats = {
      totalVulnerabilities: analysis.vulnerabilities.length,
      criticalVulnerabilities: analysis.vulnerabilities.filter(v => v.severity === 'critical').length,
      highVulnerabilities: analysis.vulnerabilities.filter(v => v.severity === 'high').length,
      mediumVulnerabilities: analysis.vulnerabilities.filter(v => v.severity === 'medium').length,
      lowVulnerabilities: analysis.vulnerabilities.filter(v => v.severity === 'low').length,
      scores: {
        ssl: ssl.score || 0,
        headers: headers.score || 0,
        cookies: cookies.score || 0,
        html: html.score || 0
      }
    };
  }

  /**
   * Calcula score geral baseado em todas as análises
   * @private
   */
  _calculateOverallScore(analysis) {
    const { ssl, headers, cookies, html } = analysis;
    
    // Pesos para cada categoria
    const weights = {
      ssl: 0.25,      // 25%
      headers: 0.35,  // 35%
      cookies: 0.25,  // 25%
      html: 0.15      // 15%
    };

    // Scores individuais (0-100)
    const scores = {
      ssl: ssl.score || 0,
      headers: headers.score || 0,
      cookies: cookies.score || 0,
      html: html.score || 0
    };

    // Score ponderado
    let weightedScore = 0;
    for (const [category, weight] of Object.entries(weights)) {
      weightedScore += scores[category] * weight;
    }

    // Penalizar por vulnerabilidades críticas
    const criticalCount = analysis.vulnerabilities.filter(v => v.severity === 'critical').length;
    weightedScore -= Math.min(criticalCount * 10, 30); // Máximo -30 pontos

    // Penalizar se não usa HTTPS
    if (!analysis.isHttps) {
      weightedScore -= 15;
    }

    return Math.max(0, Math.min(100, Math.round(weightedScore)));
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
}

module.exports = new AnalysisController();
