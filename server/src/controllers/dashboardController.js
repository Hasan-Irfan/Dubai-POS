import { getDashboardMetrics, getDashboardMetricsForDateRange } from '../services/dashboardService.js';
import { validateDateRange } from '../utils/validators.js';

// Get all dashboard metrics
export async function getAllMetrics(req, res) {
  try {
    const metrics = await getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error in getAllMetrics controller:', error);
    res.status(500).json({
      message: 'Failed to fetch dashboard metrics',
      error: error.message
    });
  }
}

// Get metrics for a specific date range
export async function getMetricsForDateRange(req, res) {
  try {
    const { startDate, endDate } = req.query;

    // Validate date range
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Both startDate and endDate are required'
      });
    }

    // Validate date format and range
    const validationError = validateDateRange(startDate, endDate);
    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    const metrics = await getDashboardMetricsForDateRange(startDate, endDate);
    res.json(metrics);
  } catch (error) {
    console.error('Error in getMetricsForDateRange controller:', error);
    res.status(500).json({
      message: 'Failed to fetch dashboard metrics for date range',
      error: error.message
    });
  }
} 