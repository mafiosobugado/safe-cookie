const { HTTP_ERROR_MESSAGES, NETWORK_ERRORS } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * Tratamento especializado de erros de rede e HTTP
 */
class NetworkErrorHandler {

  /**
   * Processa erros de rede e HTTP para mensagens amigáveis
   * @param {Error} error - Erro original
   * @param {string} url - URL que causou o erro
   * @returns {Object} - Erro processado com mensagem amigável
   */
  processNetworkError(error, url) {
    const processedError = {
      originalError: error.message,
      url,
      timestamp: new Date().toISOString(),
      category: 'network',
      severity: 'error'
    };

    // Erros de resposta HTTP (4xx, 5xx)
    if (error.response) {
      return this._handleHttpError(error, processedError);
    }

    // Erros de requisição (timeout, DNS, conexão)
    if (error.request) {
      return this._handleRequestError(error, processedError);
    }

    // Outros erros (configuração, etc.)
    return this._handleGenericError(error, processedError);
  }

  /**
   * Trata erros de resposta HTTP
   * @private
   */
  _handleHttpError(error, processedError) {
    const status = error.response.status;
    const statusText = error.response.statusText;
    
    processedError.type = 'http_response';
    processedError.status = status;
    processedError.statusText = statusText;
    
    // Categorizar por código de status
    if (status >= 400 && status < 500) {
      processedError.category = 'client_error';
      processedError.severity = status === 404 ? 'warning' : 'error';
    } else if (status >= 500) {
      processedError.category = 'server_error';
      processedError.severity = 'error';
    }

    // Mensagem específica para o código
    processedError.userMessage = this._getHttpErrorMessage(status);
    processedError.technicalMessage = `HTTP ${status}: ${statusText}`;
    
    // Sugestões baseadas no tipo de erro
    processedError.suggestions = this._getHttpErrorSuggestions(status);

    logger.analysis(processedError.url, 'http_error', {
      status,
      category: processedError.category
    });

    return processedError;
  }

  /**
   * Trata erros de requisição (rede, DNS, timeout)
   * @private
   */
  _handleRequestError(error, processedError) {
    const code = error.code;
    const message = error.message.toLowerCase();
    
    processedError.type = 'network';
    processedError.code = code;

    // Categorizar por tipo de erro de rede
    if (code === 'ENOTFOUND' || message.includes('getaddrinfo')) {
      processedError.category = 'dns';
      processedError.severity = 'error';
      processedError.userMessage = 'Site não encontrado. Verifique se a URL está correta.';
      processedError.technicalMessage = 'Erro de resolução DNS';
      processedError.suggestions = [
        'Verifique se o nome do site está escrito corretamente',
        'Tente adicionar "www." no início da URL',
        'Verifique sua conexão com a internet',
        'O site pode estar temporariamente fora do ar'
      ];
      
    } else if (code === 'ECONNREFUSED') {
      processedError.category = 'connection';
      processedError.severity = 'error';
      processedError.userMessage = 'Conexão recusada pelo servidor.';
      processedError.technicalMessage = 'Servidor recusou a conexão';
      processedError.suggestions = [
        'O servidor pode estar sobrecarregado',
        'Tente novamente em alguns minutos',
        'Verifique se a porta está correta (80 para HTTP, 443 para HTTPS)'
      ];
      
    } else if (code === 'ETIMEDOUT' || message.includes('timeout')) {
      processedError.category = 'timeout';
      processedError.severity = 'warning';
      processedError.userMessage = 'Tempo limite esgotado. O site demorou muito para responder.';
      processedError.technicalMessage = 'Timeout na conexão';
      processedError.suggestions = [
        'Tente novamente - pode ser lentidão temporária',
        'Verifique sua conexão com a internet',
        'O servidor pode estar sobrecarregado'
      ];
      
    } else if (code === 'ECONNRESET') {
      processedError.category = 'connection';
      processedError.severity = 'error';
      processedError.userMessage = 'Conexão foi interrompida pelo servidor.';
      processedError.technicalMessage = 'Conexão reiniciada pelo servidor';
      processedError.suggestions = [
        'Tente novamente em alguns momentos',
        'O servidor pode ter reiniciado',
        'Possível problema temporário no servidor'
      ];
      
    } else if (message.includes('certificate') || message.includes('ssl') || message.includes('tls')) {
      processedError.category = 'ssl';
      processedError.severity = 'error';
      processedError.userMessage = 'Problema com o certificado SSL/TLS do site.';
      processedError.technicalMessage = 'Erro de certificado SSL';
      processedError.suggestions = [
        'O certificado do site pode estar expirado',
        'O site pode ter configuração SSL incorreta',
        'Tente acessar via HTTP se disponível (menos seguro)'
      ];
      
    } else if (code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
      processedError.category = 'network';
      processedError.severity = 'error';
      processedError.userMessage = 'Servidor inacessível pela rede.';
      processedError.technicalMessage = 'Host ou rede inacessível';
      processedError.suggestions = [
        'Verifique sua conexão com a internet',
        'O servidor pode estar fora do ar',
        'Problema de roteamento de rede'
      ];
      
    } else {
      // Erro de rede genérico
      processedError.category = 'network';
      processedError.severity = 'error';
      processedError.userMessage = NETWORK_ERRORS[code] || 'Erro de conexão com o servidor.';
      processedError.technicalMessage = `Erro de rede: ${code || 'desconhecido'}`;
      processedError.suggestions = [
        'Verifique sua conexão com a internet',
        'Tente novamente em alguns minutos',
        'O problema pode estar no servidor'
      ];
    }

    logger.analysis(processedError.url, 'network_error', {
      code,
      category: processedError.category
    });

    return processedError;
  }

  /**
   * Trata erros genéricos
   * @private
   */
  _handleGenericError(error, processedError) {
    processedError.type = 'generic';
    processedError.category = 'application';
    processedError.severity = 'error';
    processedError.userMessage = 'Erro interno na análise da URL.';
    processedError.technicalMessage = error.message;
    processedError.suggestions = [
      'Tente novamente',
      'Verifique se a URL está correta',
      'Entre em contato com o suporte se o problema persistir'
    ];

    logger.errorWithContext(error, { url: processedError.url });

    return processedError;
  }

  /**
   * Retorna mensagem amigável para códigos HTTP
   * @private
   */
  _getHttpErrorMessage(status) {
    return HTTP_ERROR_MESSAGES[status] || `Erro HTTP ${status}`;
  }

  /**
   * Retorna sugestões baseadas no código HTTP
   * @private
   */
  _getHttpErrorSuggestions(status) {
    const suggestions = {
      400: [
        'Verifique se a URL está formatada corretamente',
        'Remova caracteres especiais da URL'
      ],
      401: [
        'O site requer autenticação',
        'Tente acessar a página principal do site'
      ],
      403: [
        'Você não tem permissão para acessar este recurso',
        'Tente acessar a página principal',
        'O site pode bloquear bots/ferramentas automatizadas'
      ],
      404: [
        'A página não existe ou foi movida',
        'Verifique se a URL está correta',
        'Tente acessar a página principal do site'
      ],
      408: [
        'Tente novamente - timeout do servidor',
        'O servidor está respondendo lentamente'
      ],
      429: [
        'Muitas requisições - aguarde alguns minutos',
        'O site tem limite de taxa de requisições'
      ],
      500: [
        'Erro interno do servidor',
        'Tente novamente em alguns minutos',
        'O problema está no lado do servidor'
      ],
      502: [
        'Problema no gateway/proxy do servidor',
        'Tente novamente em alguns minutos'
      ],
      503: [
        'Serviço temporariamente indisponível',
        'O servidor pode estar em manutenção',
        'Tente novamente mais tarde'
      ],
      504: [
        'Timeout do gateway',
        'O servidor está sobrecarregado',
        'Tente novamente em alguns minutos'
      ]
    };

    return suggestions[status] || [
      'Tente novamente em alguns minutos',
      'Verifique se a URL está correta'
    ];
  }

  /**
   * Cria uma versão resumida do erro para logs
   * @param {Object} error - Erro processado
   * @returns {Object} - Versão resumida
   */
  createErrorSummary(error) {
    return {
      type: error.type,
      category: error.category,
      severity: error.severity,
      status: error.status,
      code: error.code,
      url: error.url,
      userMessage: error.userMessage
    };
  }

  /**
   * Verifica se o erro é recuperável (vale a pena tentar novamente)
   * @param {Object} error - Erro processado
   * @returns {boolean} - Se é recuperável
   */
  isRecoverableError(error) {
    // Erros de timeout e problemas temporários de rede
    if (error.category === 'timeout' || error.category === 'connection') {
      return true;
    }

    // Alguns códigos HTTP específicos
    if (error.status && [408, 429, 502, 503, 504].includes(error.status)) {
      return true;
    }

    return false;
  }
}

module.exports = new NetworkErrorHandler();
