const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middlewares/errorHandler');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// importar rotas existentes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const emailRoutes = require('./routes/emailRoutes');

// registar rotas
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/email', emailRoutes);

//error
app.use(errorHandler);

// iniciar o servidor

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅✅Servidor a correr na porta ${PORT}`);});
  