function gerarRelatorio(analise) {
  const { url, cookies = [], vulnerabilidades = [], score = 0 } = analise;

  return `
Relatório de Análise - Safe Cookie

URL analisada: ${url}

Nota de segurança: ${score}/10

Vulnerabilidades encontradas:
${vulnerabilidades.length > 0 
  ? vulnerabilidades.map(v => `- ${v.technical}: ${v.explanation}`).join('\n') 
  : 'Nenhuma vulnerabilidade encontrada.'}

Cookies recebidos:
${cookies.length > 0 
  ? cookies.map(c => `- ${c.name} (HttpOnly: ${c.httpOnly}, Secure: ${c.secure}, SameSite: ${c.sameSite})`).join('\n') 
  : 'Nenhum cookie recebido.'}
  `;
}

module.exports = gerarRelatorio;