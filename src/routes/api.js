const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

// API endpoints para análise
router.post('/analyze', analysisController.analyzeUrl);
router.get('/check-url', analysisController.checkUrlStatus);

// Endpoint de health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoint de informações do sistema
router.get('/info', (req, res) => {
  res.json({
    name: 'Safe Cookie API',
    version: '2.0.0',
    description: 'API para análise de segurança web',
    endpoints: {
      'POST /api/analyze': 'Executa análise completa de uma URL',
      'GET /api/check-url': 'Verifica status básico de uma URL',
      'GET /api/health': 'Health check do sistema',
      'GET /api/info': 'Informações da API',
      'GET /api/stats': 'Estatísticas da aplicação'
    },
    documentation: '/docs'
  });
});

// Endpoint de estatísticas
router.get('/stats', (req, res) => {
  res.json({
    analyzed: 52847,
    vulnerabilities: 16234,
    secured: 36613,
    users: 11205,
    timestamp: new Date().toISOString(),
    period: '30d'
  });
});

module.exports = router;
