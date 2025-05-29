import api from './api';

export const dashboardApi = {
  // Get all dashboard metrics
  getAllMetrics: async () => {
    try {
      const response = await api.get('/api/dashboard/metrics');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get metrics for specific date range
  getMetricsForDateRange: async (startDate, endDate) => {
    try {
      const response = await api.get('/api/dashboard/metrics/range', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}; 