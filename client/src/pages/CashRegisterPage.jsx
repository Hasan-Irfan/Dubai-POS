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
import { useGetAllCashEntriesQuery, useAddCashEntryMutation } from '@/api/cashApi';
import {
  setEntries,
  setPagination,
  setFilters,
  setDateRange,
  resetFilters,
} from '@/services/cashSlice';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const CashRegisterPage = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [openingDialog, setOpeningDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [reference, setReference] = useState('Opening Balance');
  
  // Get state from Redux
  const { filters, pagination } = useSelector((state) => state.cash);
  const { page, limit } = pagination;

  // Mutations
  const [addCashEntry] = useAddCashEntryMutation();

  // Get data with search parameters
  const { data, isLoading, error } = useGetAllCashEntriesQuery({
    page,
    limit,
    type: filters.type === 'all' ? undefined : filters.type,
    from: filters.dateRange.from,
    to: filters.dateRange.to,
  });

  // Check if there's an opening balance
  const hasOpeningBalance = data?.entries?.some(entry => entry.type === 'Opening');

  const handleAddOpeningBalance = async () => {
    try {
      await addCashEntry({
        type: 'Opening',
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
        description: error.data?.message || 'Failed to fetch cash entries',
      });
    }
  }, [error, toast]);

  // Update state from API response
  useEffect(() => {
    if (data?.entries) {
      dispatch(setEntries(data.entries));
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
        <h1 className="text-3xl font-bold">Cash Register</h1>
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
              <Label>Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Opening">Opening</SelectItem>
                  <SelectItem value="Inflow">Inflow</SelectItem>
                  <SelectItem value="Outflow">Outflow</SelectItem>
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

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Entries</CardTitle>
          <CardDescription>
            Showing {data?.pagination.total} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.entries.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell>
                    {format(new Date(entry.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        entry.type === 'Opening' ? 'secondary' :
                        entry.type === 'Inflow' ? 'success' : 'destructive'
                      }
                    >
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.reference || '-'}</TableCell>
                  <TableCell>
                    <span className={
                      entry.type === 'Opening' ? 'text-gray-600' :
                      entry.type === 'Inflow' ? 'text-green-600' : 'text-red-600'
                    }>
                      {entry.amount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{entry.balance.toFixed(2)}</TableCell>
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

export default CashRegisterPage;