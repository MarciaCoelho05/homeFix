const pool = require("../config/db.js");


async function test(){
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Ligado ao PostgreSQL. Hora do servidor:', res.rows[0].now);
}
    catch (err) {
        console.error('❌Erro ao conectar ao postgresql:', err);
    } finally {
        pool.end();
    }
}

test();


