/**
 * Middleware de validação de entrada
 */

/**
 * Middleware básico de validação
 */
function validation(req, res, next) {
  // Sanitizar entrada básica
  if (req.body) {
    // Remover propriedades perigosas
    delete req.body.__proto__;
    delete req.body.constructor;
    delete req.body.prototype;
  }
  
  next();
}

/**
 * Validação específica para URLs
 */
function validateUrl(req, res, next) {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({
      error: true,
      message: 'URL é obrigatória',
      code: 'MISSING_URL'
    });
  }
  
  // Validação básica de URL
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      error: true,
      message: 'URL inválida',
      code: 'INVALID_URL'
    });
  }
  
  next();
}

module.exports = validation;
module.exports.validateUrl = validateUrl;
