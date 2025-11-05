let app;
let serverLoaded = false;

try {
  console.log('[API Handler] Loading server...');
  app = require('../src/server');
  serverLoaded = true;
  console.log('[API Handler] Server loaded successfully');
} catch (error) {
  console.error('[API Handler] Error loading server:', error);
  console.error('[API Handler] Stack:', error.stack);
  serverLoaded = false;
  
  const express = require('express');
  app = express();
  app.use(express.json());
  
  app.use((req, res) => {
    console.error('[API Handler] Request received but server failed to load');
    res.status(500).json({
      error: 'Erro ao carregar servidor',
      message: error.message,
      path: req.path,
      method: req.method
    });
  });
}

module.exports = (req, res) => {
  const startTime = Date.now();
  const method = req.method || 'GET';
  const path = req.path || req.url || '/';
  
  console.log(`[API Handler] ${method} ${path} - ${new Date().toISOString()}`);
  console.log(`[API Handler] Server loaded: ${serverLoaded}`);
  
  if (!serverLoaded) {
    console.error('[API Handler] Server not loaded, returning error');
    return res.status(500).json({
      error: 'Servidor não inicializado',
      message: 'O servidor falhou ao carregar. Verifique os logs.'
    });
  }
  
  try {
    app(req, res, (err) => {
      if (err) {
        console.error('[API Handler] Express error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Erro ao processar requisição',
            message: err.message
          });
        }
      }
    });
    
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.log(`[API Handler] ${method} ${path} took ${duration}ms`);
    }
  } catch (error) {
    console.error('[API Handler] Error handling request:', error);
    console.error('[API Handler] Stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro ao processar requisição',
        message: error.message,
        path: path,
        method: method
      });
    }
  }
};

