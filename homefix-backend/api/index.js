let app;
try {
  console.log('[API Handler] Loading server...');
  app = require('../src/server');
  console.log('[API Handler] Server loaded successfully');
} catch (error) {
  console.error('[API Handler] Error loading server:', error);
  console.error('[API Handler] Stack:', error.stack);
  const express = require('express');
  app = express();
  app.use(express.json());
  app.use((req, res) => {
    console.error('[API Handler] Request received but server failed to load');
    res.status(500).json({
      error: 'Erro ao carregar servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  });
}

module.exports = async (req, res) => {
  const startTime = Date.now();
  console.log(`[API Handler] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  
  try {
    // Adicionar timeout para evitar requisições travadas
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error('[API Handler] Request timeout');
        res.status(504).json({ error: 'Timeout na requisição' });
      }
    }, 30000); // 30 segundos
    
    await new Promise((resolve, reject) => {
      const originalEnd = res.end;
      res.end = function(...args) {
        clearTimeout(timeout);
        originalEnd.apply(this, args);
        resolve();
      };
      
      app(req, res);
    });
    
    const duration = Date.now() - startTime;
    console.log(`[API Handler] ${req.method} ${req.path} completed in ${duration}ms`);
  } catch (error) {
    clearTimeout(timeout);
    console.error('[API Handler] Error handling request:', error);
    console.error('[API Handler] Stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro ao processar requisição',
        message: error.message,
        path: req.path,
        method: req.method
      });
    }
  }
};

