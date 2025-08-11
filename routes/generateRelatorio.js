const express = require('express');
const router = express.Router();
const gerarRelatorio = require('../modules/relatorio/gerarRelatorio');

router.post('/', (req, res) => {
  try {
    const analise = req.body;

    if (!analise || Object.keys(analise).length === 0) {
      return res.status(400).send('Dados da análise não enviados.');
    }

    const relatorio = gerarRelatorio(analise);

    res.setHeader('Content-Disposition', 'attachment; filename=relatorio.txt');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(relatorio);
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    res.status(500).send('Erro ao gerar relatório');
  }
});

module.exports = router;