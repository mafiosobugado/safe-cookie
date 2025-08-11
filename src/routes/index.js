const express = require('express');
const router = express.Router();

// Página inicial (home) - simples e direto
router.get('/', (req, res) => {
  res.render('pages/home', {
    pageTitle: 'Safe Cookie - Advanced Web Security Analysis',
    pageDescription: 'Comprehensive security analysis for cookies, SSL, headers and vulnerabilities',
    currentPage: 'home',
    additionalJS: [
      '/js/pages/home.js',
      '/js/pages/home/url-form.js',
      '/js/pages/home/stats-counter.js',
      '/js/pages/home/features-section.js',
      '/js/pages/home/hero-section.js',
      '/js/pages/home/demo-section.js'
    ]
  });
});

module.exports = router;
