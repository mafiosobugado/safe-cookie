const express = require('express');
const axios = require('axios');
const setCookie = require('set-cookie-parser');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();

// Carrega o headers.json
const headersSeguranca = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'headers.json'), 'utf-8')
);

// Configurações do Express
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Importa rota modular do relatório
const generateRelatorioRoute = require('./routes/generateRelatorio');
app.use('/generate_relatorio', generateRelatorioRoute);

// Rota principal
app.get('/', (req, res) => {
  res.render('index', { cookies: null, url: null, error: null, vulnerabilidades: [], score: null });
});

// Rota /analisar
app.post('/analisar', async (req, res) => {
  let url = req.body.url.trim();

  if (!/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }

  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36'
      }
    });

    // DEBUG: mostra os headers no terminal
    console.log('HEADERS RECEBIDOS:');
    console.log(response.headers);

    // Captura cookies
    const cookies = setCookie.parse(response.headers['set-cookie'] || []);
    console.log('COOKIES PARSEADOS:');
    console.log(cookies);

    const html = response.data;
    const $ = cheerio.load(html);

    const vulnerabilidades = [];

    if ($('form').length > 0 && !url.startsWith('https://')) {
      vulnerabilidades.push({
        technical: "Formulário sem HTTPS",
        element: "<form>",
        explanation: "Formulários que enviam dados sem HTTPS podem ser interceptados.",
        badCode: "<form action='http://...'>",
        userHelp: "Sempre utilize HTTPS para proteger os dados enviados pelo formulário."
      });
    }

    if ($('input[type="password"]').length === 0) {
      vulnerabilidades.push({
        technical: "Campo senha ausente",
        element: "<input>",
        explanation: "Não há campo de senha detectado, o que pode indicar falta de proteção.",
        badCode: "<input type='text'>",
        userHelp: "Utilize <input type='password'> para proteger informações sensíveis."
      });
    }

    const scriptsHttp = $("script[src^='http://']");
    if (scriptsHttp.length > 0) {
      vulnerabilidades.push({
        technical: "Scripts via HTTP",
        element: "<script>",
        explanation: "Scripts via HTTP podem ser interceptados ou modificados por atacantes.",
        badCode: scriptsHttp.first().toString(),
        userHelp: "Use apenas HTTPS para carregar scripts externos."
      });
    }

    const headersLower = Object.fromEntries(
      Object.entries(response.headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    for (const [header, description] of Object.entries(headersSeguranca)) {
      if (!headersLower[header.toLowerCase()]) {
        vulnerabilidades.push({
          technical: `Cabeçalho ${header} ausente`,
          element: "HTTP Header",
          explanation: description,
          badCode: `Falta do cabeçalho ${header}`,
          userHelp: `Adicione o cabeçalho "${header}" na resposta do servidor para melhorar a segurança.`
        });
      }
    }

    cookies.forEach(cookie => {
      cookie.explicacao = explicacaoCookie(cookie.name);
    });

    let score = 10 - vulnerabilidades.length;
    if (score < 0) score = 0;

    res.render('index', { cookies, url, error: null, vulnerabilidades, score });
  } catch (error) {
    console.error('Erro na análise:', error.message);
    res.render('index', { cookies: null, url, error: error.message, vulnerabilidades: [], score: 0 });
  }
});

// Função para explicar cookies
function explicacaoCookie(name) {
  const explicacoes = {
    'PHPSESSID': 'Cookie de sessão do PHP para identificar usuários únicos.',
    'JSESSIONID': 'Cookie de sessão usado em servidores Java.',
    'ASP.NET_SessionId': 'Cookie de sessão para aplicações ASP.NET.',
    'csrftoken': 'Usado para proteção contra ataques CSRF.',
    'SID': 'Identificador de sessão do Google.',
    'NID': 'Cookie usado pelo Google para personalizar anúncios.',
  };
  return explicacoes[name] || 'Cookie genérico utilizado para diversas funções no site.';
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Safe Cookie rodando em http://localhost:${PORT}`);
});
