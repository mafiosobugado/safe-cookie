const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Middleware imports
const { errorHandler } = require('../middleware/errorHandler');
const validation = require('../middleware/validation');
const security = require('../middleware/security');

// Route imports
const indexRoutes = require('../routes/index');
const apiRoutes = require('../routes/api');
const reportsRoutes = require('../routes/reports');

/**
 * Configura e retorna a aplicação Express
 */
function createApp() {
  const app = express();

  // Configurações básicas
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../../views'));
  app.set('trust proxy', 1); // Para reverse proxy

  // Middleware de segurança
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Permitir inline scripts
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }));

  // Rate limiting - mais flexível em desenvolvimento
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 em dev, 100 em prod
    message: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Compressão
  app.use(compression());

  // Middleware de parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Arquivos estáticos
  app.use(express.static(path.join(__dirname, '../../public')));

  // Middleware customizado
  app.use(security);
  app.use(validation);

  // Rotas principais
  app.use('/', indexRoutes);
  app.use('/api', apiRoutes);
  app.use('/reports', reportsRoutes);

  // Middleware de tratamento de erros (deve ser o último)
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
