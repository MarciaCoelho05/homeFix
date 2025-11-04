let app;
try {
  app = require('../src/server');
  console.log('Server loaded successfully');
} catch (error) {
  console.error('Error loading server:', error);
  const express = require('express');
  app = express();
  app.use(express.json());
  app.use((req, res) => {
    res.status(500).json({
      error: 'Erro ao carregar servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  });
}

module.exports = (req, res) => {
  try {
    return app(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro ao processar requisição',
        message: error.message
      });
    }
  }
};

