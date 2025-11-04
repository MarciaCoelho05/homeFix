function errorHandler(err, req, res, next) {
    const origin = req.headers.origin;
    
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    console.error('[ERROR]', err.stack || err.message);
    
    if (!res.headersSent) {
        res.status(err.statusCode || 500).json({
            message: err.message || 'Erro interno do servidor'
        });
    }
}

module.exports = errorHandler;