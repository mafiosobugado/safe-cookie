const express = require('express');
const router = express.Router();

// Rota para relatórios (implementação futura)
router.get('/:analysisId', (req, res) => {
  res.json({ 
    message: 'Reports functionality coming soon',
    analysisId: req.params.analysisId 
  });
});

module.exports = router;
