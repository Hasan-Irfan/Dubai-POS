import express from 'express';
import { getAllMetrics, getMetricsForDateRange } from '../controllers/dashboardController.js';

const router = express.Router();

// Get all metrics
router.get('/metrics', getAllMetrics);

// Get metrics for date range
router.get('/metrics/range', getMetricsForDateRange);

export default router; 