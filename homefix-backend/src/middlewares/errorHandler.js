function errorHandler(err, req, res, next) {
    // Garantir que CORS está configurado mesmo em erros
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Erro interno do servidor'
    });
}

module.exports = errorHandler;