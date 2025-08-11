const winston = require('winston');
const path = require('path');

// Configurar o logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'safe-cookie' },
  transports: [
    // Arquivo de erro
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../data/logs/error.log'), 
      level: 'error' 
    }),
    // Arquivo combinado
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../data/logs/combined.log') 
    }),
  ],
});

// Se não estiver em produção, também log no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Função para estruturar logs de análise
logger.analysis = (url, action, data = {}) => {
  logger.info('Analysis Action', {
    url,
    action,
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Função para logs de erro estruturados
logger.errorWithContext = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });
};

// Função para logs de performance
logger.performance = (operation, duration, metadata = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    timestamp: new Date().toISOString(),
    ...metadata
  });
};

module.exports = logger;
