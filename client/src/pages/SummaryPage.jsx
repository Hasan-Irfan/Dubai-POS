import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useGetMonthlySummaryQuery } from '@/api/reportApi';

    const SummaryPage = () => {
  // Get the first and last day of current month for default date range
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // Format dates for display in the input fields (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format dates for API (ISO format)
  const formatDateForAPI = (dateString) => {
    const date = new Date(dateString);
    // Set the time to start of day for 'from' and end of day for 'to'
    return date.toISOString();
  };

  const [dateRange, setDateRange] = useState({
    from: formatDateForInput(firstDay),
    to: formatDateForInput(lastDay),
  });

  // Transform dates to ISO format for API call
  const apiDateRange = {
    from: formatDateForAPI(dateRange.from),
    to: formatDateForAPI(dateRange.to),
  };

  console.log('Date Range being sent to API:', apiDateRange);

  const { data: summaryData, isLoading, error } = useGetMonthlySummaryQuery(apiDateRange);

  console.log('Raw API Response:', summaryData);
  console.log('Loading state:', isLoading);
  console.log('Error state:', error);

  const handleDateChange = (key, value) => {
    setDateRange(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    console.log('Component is in loading state');
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-lg text-muted-foreground">Loading summary data...</p>
      </div>
    );
  }

  if (error) {
    console.log('Component encountered an error:', error);
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-lg text-destructive">Error loading summary data</p>
        <p className="text-sm text-muted-foreground">{error.data?.message || error.message}</p>
      </div>
    );
  }

  // Safely access the data with default values
  const creditAmount = summaryData?.summary?.totals?.creditSAR ?? 0;
  const debitAmount = summaryData?.summary?.totals?.debitSAR ?? 0;
  const transactions = Array.isArray(summaryData?.summary?.summary) ? summaryData.summary.summary : [];

  console.log('Processed values:', {
    creditAmount,
    debitAmount,
    transactionsCount: transactions.length
  });

      return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
          Financial Summary
        </h1>
        <div className="flex items-center gap-4">
          <div>
            <Label>From</Label>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
            />
          </div>
        <div>
            <Label>To</Label>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
            />
          </div>
        </div>
          </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Credits (Income)</CardTitle>
            <CardDescription>Total money received</CardDescription>
              </CardHeader>
              <CardContent>
            <p className="text-4xl font-bold text-green-600">
              SAR {creditAmount.toFixed(2)}
            </p>
              </CardContent>
            </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debits (Expenses)</CardTitle>
            <CardDescription>Total money spent</CardDescription>
              </CardHeader>
              <CardContent>
            <p className="text-4xl font-bold text-destructive">
              SAR {debitAmount.toFixed(2)}
            </p>
              </CardContent>
            </Card>
          </div>

      {/* Transactions Table */}
      <Card>
              <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
          <CardDescription>Detailed breakdown of all transactions</CardDescription>
              </CardHeader>
              <CardContent>
          {!Array.isArray(transactions) || transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for the selected period
                </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount (SAR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item?.description || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={item?.type === 'credit' ? 'text-green-600' : 'text-destructive'}>
                        {item?.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={item?.type === 'credit' ? 'text-green-600' : 'text-destructive'}>
                        {typeof item?.totalSAR === 'number' ? item.totalSAR.toFixed(2) : '0.00'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
              </CardContent>
            </Card>
        </div>
      );
    };

    export default SummaryPage;