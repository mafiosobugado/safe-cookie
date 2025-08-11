/**
 * Helper para renderização de páginas com layout
 */

/**
 * Renderiza uma página usando o layout base
 * @param {Response} res - Objeto response do Express
 * @param {string} page - Nome da página (ex: 'home', 'analysis')
 * @param {Object} data - Dados para a página
 * @param {Object} options - Opções de layout
 */
function renderPage(res, page, data = {}, options = {}) {
  const defaultOptions = {
    layout: 'base', // Layout padrão
    currentPage: page,
    showNavigation: true,
    showSocial: true,
    showModals: true,
    theme: 'dark'
  };

  const layoutOptions = { ...defaultOptions, ...options };
  const pageData = { ...data, ...layoutOptions };

  // Renderizar página específica como body
  res.render(`layouts/${layoutOptions.layout}`, {
    ...pageData,
    body: res.app.get('view engine') === 'ejs' 
      ? res.render(`pages/${page}`, pageData, (err, html) => html)
      : `<%- include('../pages/${page}', ${JSON.stringify(pageData)}) %>`
  });
}

/**
 * Renderiza uma página simples sem layout complexo
 * @param {Response} res - Objeto response do Express
 * @param {string} page - Nome da página
 * @param {Object} data - Dados para a página
 */
function renderSimplePage(res, page, data = {}) {
  res.render(`pages/${page}`, data);
}

/**
 * Configurações padrão para diferentes tipos de página
 */
const pageConfigs = {
  home: {
    pageTitle: 'Safe Cookie - Análise Avançada de Segurança Web',
    pageDescription: 'Ferramenta profissional para análise de segurança web. Verifique cookies, SSL, headers HTTP e vulnerabilidades.',
    pageKeywords: 'segurança web, cookies, SSL, headers HTTP, vulnerabilidades, análise segurança',
    currentPage: 'home',
    additionalJS: [
      '/js/pages/home.js',
      '/js/pages/home/url-form.js',
      '/js/pages/home/stats-counter.js',
      '/js/pages/home/features-section.js',
      '/js/pages/home/hero-section.js',
      '/js/pages/home/demo-section.js'
    ]
  },
  
  analysis: {
    pageTitle: 'Resultados da Análise | Safe Cookie',
    pageDescription: 'Resultados detalhados da análise de segurança web',
    currentPage: 'analysis',
    additionalJS: ['/js/pages/analysis.js'],
    mainClass: 'analysis-main'
  },
  
  about: {
    pageTitle: 'Sobre o Safe Cookie',
    pageDescription: 'Conheça mais sobre a ferramenta Safe Cookie e nossa missão de tornar a web mais segura',
    currentPage: 'about'
  },
  
  docs: {
    pageTitle: 'Documentação | Safe Cookie',
    pageDescription: 'Documentação completa da ferramenta Safe Cookie',
    currentPage: 'docs',
    additionalCSS: ['/css/docs.css']
  }
};

/**
 * Renderiza uma página usando configuração pré-definida
 * @param {Response} res - Objeto response do Express
 * @param {string} page - Nome da página
 * @param {Object} customData - Dados customizados (opcional)
 * @param {Object} customOptions - Opções customizadas (opcional)
 */
function renderConfiguredPage(res, page, customData = {}, customOptions = {}) {
  const config = pageConfigs[page] || {};
  const data = { ...config, ...customData };
  const options = { ...customOptions };
  
  renderPage(res, page, data, options);
}

module.exports = {
  renderPage,
  renderSimplePage,
  renderConfiguredPage,
  pageConfigs
};
