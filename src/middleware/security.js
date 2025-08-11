/**
 * Middleware de segurança customizado
 */

/**
 * Middleware de segurança adicional
 */
function security(req, res, next) {
  // Headers de segurança customizados
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP permitindo inline scripts (para desenvolvimento)
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "script-src 'self' 'unsafe-inline';"
  );
  
  // Remover header que expõe tecnologia
  res.removeHeader('X-Powered-By');
  
  next();
}

module.exports = security;
