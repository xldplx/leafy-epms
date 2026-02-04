const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/constants');
const authRoutes = require('./routes/authRoutes');

const app = express();

// global middleware
app.use(cors());
app.use(express.json());

// the routes
app.use('/api', authRoutes);

// health check, this is to check if the API is running or not, use it by navigating to "localhost:5000/"
app.get('/', (req, res) => {
    res.send('EPMS Enterprise System API is running...');
});

// server start
app.listen(PORT, () => {
    console.log(`Server is currently running on port: ${PORT}`);
});