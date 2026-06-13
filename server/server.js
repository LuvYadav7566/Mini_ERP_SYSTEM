import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import { errorHandler } from './middleware/error.middleware.js';

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Routes
// We use systematic route registration:
import authRouter from './routes/auth.routes.js';
import productRouter from './routes/product.routes.js';
import vendorRouter from './routes/vendor.routes.js';
import purchaseRouter from './routes/purchase.routes.js';
import manufacturingRouter from './routes/manufacturing.routes.js';
import salesRouter from './routes/sales.routes.js';

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/vendors', vendorRouter);
app.use('/api/v1/purchase', purchaseRouter);
app.use('/api/v1/manufacturing', manufacturingRouter);
app.use('/api/v1/sales', salesRouter);

// Base route
app.get('/', (req, res) => {
  res.send('Mini ERP API is running...');
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
