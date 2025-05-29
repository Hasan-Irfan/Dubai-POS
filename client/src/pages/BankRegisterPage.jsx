import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  PlusCircle,
} from 'lucide-react';
import { useGetAllBankTransactionsQuery, useAddBankTransactionMutation } from '@/api/bankApi';
import {
  setTransactions,
  setPagination,
  setFilters,
  setDateRange,
  resetFilters,
} from '@/services/bankSlice';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const BankRegisterPage = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [openingDialog, setOpeningDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingMethod, setOpeningMethod] = useState('Bank'); // Default to Bank
  const [reference, setReference] = useState('Opening Balance');
  
  // Get state from Redux
  const { filters, pagination } = useSelector((state) => state.bank);
  const { page, limit } = pagination;

  // Mutations
  const [addBankTransaction] = useAddBankTransactionMutation();

  // Get data with search parameters
  const { data, isLoading, error } = useGetAllBankTransactionsQuery({
    page,
    limit,
    method: filters.method === 'all' ? undefined : filters.method,
    from: filters.dateRange.from,
    to: filters.dateRange.to,
  });

  // Check if there's an opening balance for the selected method
  const hasOpeningBalance = data?.transactions?.some(
    transaction => transaction.type === 'Opening' && transaction.method === filters.method
  );

  const handleAddOpeningBalance = async () => {
    try {
      await addBankTransaction({
        type: 'Opening',
        method: openingMethod,
        amount: Number(openingBalance),
        reference,
      }).unwrap();
      
      toast({
        title: 'Success',
        description: 'Opening balance added successfully',
      });
      setOpeningDialog(false);
      setOpeningBalance('');
      setReference('Opening Balance');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || error.message || 'Failed to add opening balance',
      });
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    dispatch(setPagination({ ...pagination, page: 1 }));
  }, [filters, dispatch]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || 'Failed to fetch bank transactions',
      });
    }
  }, [error, toast]);

  // Update state from API response
  useEffect(() => {
    if (data?.transactions) {
      dispatch(setTransactions(data.transactions));
    }
    if (data?.pagination) {
      dispatch(setPagination(data.pagination));
    }
  }, [data, dispatch]);

  // Reset filters when component unmounts
  useEffect(() => {
    return () => {
      dispatch(resetFilters());
    };
  }, [dispatch]);

  // Handlers
  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handleDateRangeChange = (key, value) => {
    dispatch(setDateRange({ ...filters.dateRange, [key]: value }));
  };

  const handlePageChange = (newPage) => {
    dispatch(setPagination({ ...pagination, page: newPage }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bank Register</h1>
        {!hasOpeningBalance && (
          <Button onClick={() => setOpeningDialog(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Opening Balance
          </Button>
        )}
      </div>

      {/* Opening Balance Dialog */}
      <Dialog open={openingDialog} onOpenChange={setOpeningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Opening Balance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Method</Label>
              <Select
                value={openingMethod}
                onValueChange={setOpeningMethod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Shabka">Shabka</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Opening Balance Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="Enter opening balance"
              />
            </div>
            <div>
              <Label>Reference</Label>
              <Input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpeningDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOpeningBalance}>
              Add Opening Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Method</Label>
              <Select
                value={filters.method}
                onValueChange={(value) => handleFilterChange('method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Shabka">Shabka</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => handleDateRangeChange('from', e.target.value)}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => handleDateRangeChange('to', e.target.value)}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Transactions</CardTitle>
          <CardDescription>
            Showing {data?.pagination.total} total transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>

                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.transactions.map((transaction) => (
                <TableRow key={transaction._id}>
                  <TableCell>
                    {format(new Date(transaction.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'Inflow' ? 'success' : 'destructive'}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.method}</TableCell>

                  <TableCell>{transaction.reference || '-'}</TableCell>
                  <TableCell>
                    <span className={transaction.type === 'Inflow' ? 'text-green-600' : 'text-red-600'}>
                      {transaction.amount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{transaction.balance.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {data?.pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!data?.pagination.hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!data?.pagination.hasNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BankRegisterPage;