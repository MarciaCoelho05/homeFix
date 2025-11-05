function errorHandler(err, req, res, next) {
    const origin = req.headers.origin;
    
    // Garantir que headers CORS sejam sempre enviados, mesmo em caso de erro
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
    
    console.error('[ERROR]', err.stack || err.message);
    
    // Se for OPTIONS, retornar 204 mesmo em caso de erro
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    if (!res.headersSent) {
        res.status(err.statusCode || 500).json({
            message: err.message || 'Erro interno do servidor'
        });
    }
}

module.exports = errorHandler;