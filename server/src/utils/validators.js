// Validate date range
export function validateDateRange(startDate, endDate) {
  // Check if dates are valid
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return 'Invalid start date format';
  }

  if (isNaN(end.getTime())) {
    return 'Invalid end date format';
  }

  // Check if start date is before end date
  if (start > end) {
    return 'Start date must be before end date';
  }

  // Check if date range is not too large (e.g., more than 1 year)
  const oneYear = 365 * 24 * 60 * 60 * 1000; // milliseconds in a year
  if (end - start > oneYear) {
    return 'Date range cannot exceed 1 year';
  }

  return null; // no error
} 