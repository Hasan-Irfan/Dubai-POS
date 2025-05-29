import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetMetricsForDateRangeQuery } from '@/api/dashboardApi';
import { formatCurrency } from '@/utils/formatters';
import { Calendar as CalendarIcon } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MetricCard = ({ title, value, subtitle }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="text-lg font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-primary">
        {formatCurrency(value)}
      </div>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-2">
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
);
    
const TopPerformersCard = ({ title, data }) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle className="text-lg font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {data?.map((item, index) => (
          <div key={item._id} className="space-y-1">
            <p className="font-medium">
              {index + 1}. {item.name}
            </p>
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(item.totalSales || item.totalPurchases)}
            </p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

function DashboardPage() {
  const [startDate, setStartDate] = React.useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = React.useState(new Date());

  const { data: metrics, isLoading, error } = useGetMetricsForDateRangeQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  const salesChartData = {
    labels: ['Total Sales', 'Total Expenses', 'Net Profit', 'Gross Profit'],
    datasets: [
      {
        label: 'Financial Overview',
        data: metrics ? [
          metrics.financial.totalSales,
          metrics.financial.totalExpenses,
          metrics.financial.netProfit,
          metrics.financial.grossProfit
        ] : [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Financial Overview',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-lg">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-lg text-destructive">Error loading dashboard data: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-primary via-accent to-secondary text-transparent bg-clip-text">
          Dashboard Overview
        </h1>
        <p className="text-lg text-muted-foreground">Monitor your business performance and metrics.</p>
      </div>

      {/* Date Range Picker */}
      {/* <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="mr-2 h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="grid gap-2">
              <Input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="w-[240px]"
              />
            </div>
            <div className="grid gap-2">
              <Input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="w-[240px]"
              />
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Financial Metrics */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Sales"
          value={metrics?.financial.totalSales}
        />
        <MetricCard
          title="Net Profit"
          value={metrics?.financial.netProfit}
        />
        <MetricCard
          title="Total Expenses"
          value={metrics?.financial.totalExpenses}
        />
        <MetricCard
          title="Gross Profit"
          value={metrics?.financial.grossProfit}
        />
      </div>

      {/* Payment Methods */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 mb-6">
        <MetricCard
          title="Credit Sales"
          value={metrics?.financial.totalCredit}
        />
        <MetricCard
          title="Debit Sales"
          value={metrics?.financial.totalDebit}
        />
      </div>

      {/* Chart and Top Performers */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <Bar data={salesChartData} options={chartOptions} />
          </CardContent>
        </Card>

        <div className="grid gap-6 grid-cols-1">
          <TopPerformersCard
            title="Top Salesmen"
            data={metrics?.topPerformers.salesmen}
          />
          <TopPerformersCard
            title="Top Vendors"
            data={metrics?.topPerformers.vendors}
          />
        </div>
      </div>
    </div>
      );
}

    export default DashboardPage;
  