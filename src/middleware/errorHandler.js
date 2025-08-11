const logger = require('../utils/logger');
const { HTTP_ERROR_MESSAGES } = require('../utils/constants');

/**
 * Middleware global de tratamento de erros
 */
function errorHandler(err, req, res, next) {
  // Log do erro com contexto
  logger.errorWithContext(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Determinar status code
  let statusCode = err.statusCode || err.status || 500;
  
  // Estrutura base da resposta de erro
  const errorResponse = {
    error: true,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Tratamento baseado no tipo de erro
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.message = 'Dados de entrada inválidos';
    errorResponse.details = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorResponse.message = 'Formato de dados inválido';
  } else if (err.code === 11000) { // MongoDB duplicate key
    statusCode = 409;
    errorResponse.message = 'Recurso já existe';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse.message = 'Token inválido';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse.message = 'Token expirado';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    errorResponse.message = 'JSON malformado';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    errorResponse.message = 'Payload muito grande';
  } else {
    // Erro genérico
    errorResponse.message = process.env.NODE_ENV === 'production' 
      ? HTTP_ERROR_MESSAGES[statusCode] || 'Erro interno do servidor'
      : err.message;
  }

  // Adicionar stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }

  // Responder com JSON para APIs, AJAX ou when accepts JSON
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/') || 
      req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest' || 
      req.accepts('json') === 'json') {
    res.status(statusCode).json(errorResponse);
  } else {
    // Renderizar página de erro
    res.status(statusCode).render('error', {
      title: 'Erro',
      message: errorResponse.message,
      status: statusCode,
      error: process.env.NODE_ENV !== 'production' ? err : {}
    });
  }
}

/**
 * Middleware para capturar rotas não encontradas
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Rota não encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

/**
 * Wrapper para funções async que podem gerar erros
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
