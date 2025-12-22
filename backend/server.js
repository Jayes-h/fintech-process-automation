const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/sequelize');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/agents', require('./routes/agentsRoutes'));
app.use('/api/mis-agent', require('./routes/misAgentRoutes'));
app.use('/api/mis-data', require('./routes/misDataRoutes'));
app.use('/api/macros', require('./routes/macrosRoutes'));
app.use('/api/brands', require('./routes/brandsRoutes'));
app.use('/api/seller-portals', require('./routes/sellerPortalsRoutes'));
app.use('/api/sku', require('./routes/skuRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Colonel Automation Platform API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection and server start
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');
    return sequelize.sync({ alter: false });
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Colonel Automation Platform API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Unable to connect to the database:', err);
    process.exit(1);
  });

module.exports = app;
