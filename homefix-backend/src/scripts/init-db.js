const pool = require("../config/db.js");


async function init(){
    try {
        await pool.query(`
        CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
        );
        `);

        await pool.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
        manutencao VARCHAR(100) NOT NULL,
        valor DECIMAL(10, 2) NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
        );
        `);
        console.log('✅Tabelas criadas.');

        await pool.query(`
        INSERT INTO clientes (nome, email) VALUES
        ('João Silva', 'joaosilva@exemplo.com'),
        ('Maria Oliveira', 'mariaoliveira@exemplo.com')
        ON CONFLICT (email) DO NOTHING;
        `);

        await pool.query(`
        INSERT INTO pedidos (cliente_id, manutencao, valor) VALUES
        (1, 'Manutenção A', 150.00),
        (1, 'Manutenção B', 200.00),
        (2, 'Manutenção C', 300.00);
        `);
        console.log('✅Dados iniciais inseridos.');
    } catch (err) {
        console.error('❌Erro ao inicializar o banco de dados:', err);
    } finally {
        pool.end();
    }
}

init();
