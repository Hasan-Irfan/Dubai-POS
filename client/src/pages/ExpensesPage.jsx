import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useGetAllExpensesQuery, useAddExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation } from '@/api/expenseApi';
import { setExpenses, setFilters, setPagination, resetFilters } from '@/services/expenseSlice';

const CATEGORIES = ['Rent','Utilities','Salaries','Commissions','Advances Recovered','Inventory','Miscellaneous'];
const PAYMENT_TYPES = ['Cash','Bank','Shabka'];

const initialExpenseState = {
  category: '',
  description: '',
  amount: '',
  paymentType: '',
  paidTo: '',
  paidToModel: '',
};

const ExpensesPage = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(initialExpenseState);

  const { filters, pagination } = useSelector((state) => state.expense);
  const { page, limit } = pagination;

  // Query
  const { data, isLoading, error } = useGetAllExpensesQuery({
    page,
    limit,
    category: filters.category === 'all' ? undefined : filters.category,
    paymentType: filters.paymentType === 'all' ? undefined : filters.paymentType,
    paidToModel: filters.paidToModel,
    paidTo: filters.paidTo,
    search: filters.search,
    from: filters.dateRange.from,
    to: filters.dateRange.to,
  });
  const [addExpense, { isLoading: isAdding }] = useAddExpenseMutation();
  const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();

  // Update state from API response
  useEffect(() => {
    if (data?.expenses) {
      dispatch(setExpenses(data.expenses));
    }
    if (data?.pagination) {
      dispatch(setPagination(data.pagination));
    }
  }, [data, dispatch]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || 'Failed to fetch expenses',
      });
    }
  }, [error, toast]);

  // Handlers
  const handleFilterChange = (key, value) => {
    dispatch(setFilters({ [key]: value }));
  };

  const handleDateRangeChange = (key, value) => {
    dispatch(setFilters({ dateRange: { ...filters.dateRange, [key]: value } }));
  };

  const handlePageChange = (newPage) => {
    dispatch(setPagination({ ...pagination, page: newPage }));
  };

  const openAddDialog = () => {
    setExpenseForm(initialExpenseState);
    setEditMode(false);
    setDialogOpen(true);
  };

  const openEditDialog = (expense) => {
    setExpenseForm({
      ...expense,
      amount: expense.amount.toString(),
    });
    setSelectedExpense(expense);
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedExpense(null);
    setExpenseForm(initialExpenseState);
  };

  const handleFormChange = (key, value) => {
    setExpenseForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...expenseForm,
        amount: Number(expenseForm.amount),
      };

      // Remove empty paidTo and paidToModel fields
      if (!payload.paidTo || !payload.paidToModel) {
        delete payload.paidTo;
        delete payload.paidToModel;
      }

      if (editMode && selectedExpense) {
        await updateExpense({ id: selectedExpense._id, ...payload }).unwrap();
        toast({ title: 'Success', description: 'Expense updated.' });
      } else {
        await addExpense(payload).unwrap();
        toast({ title: 'Success', description: 'Expense added.' });
      }
      handleDialogClose();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.data?.message || err.message || 'Failed to save expense',
      });
    }
  };

  const handleDelete = async (expense) => {
    try {
      await deleteExpense(expense._id).unwrap();
      toast({ title: 'Success', description: 'Expense deleted.' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.data?.message || err.message || 'Failed to delete expense',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <Button onClick={openAddDialog}>
          <PlusCircle className="h-4 w-4 mr-2" /> Add Expense
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select
                value={filters.paymentType || 'all'}
                onValueChange={(value) => handleFilterChange('paymentType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PAYMENT_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                  ))}
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

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense List</CardTitle>
          <CardDescription>
            Showing {data?.pagination?.total || 0} total expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.expenses?.map((expense) => (
                <TableRow key={expense._id}>
                  <TableCell>{expense.date ? new Date(expense.date).toLocaleDateString() : ''}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.amount.toFixed(2)}</TableCell>
                  <TableCell>{expense.paymentType}</TableCell>
                  <TableCell>{expense.paidTo?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(expense)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(expense)} disabled={isDeleting}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
            >
              &lt;
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
            >
              &gt;
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select
                value={expenseForm.category}
                onValueChange={(value) => handleFormChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={expenseForm.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Expense description"
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => handleFormChange('amount', e.target.value)}
              />
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select
                value={expenseForm.paymentType}
                onValueChange={(value) => handleFormChange('paymentType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose} disabled={isAdding || isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isAdding || isUpdating}>
              {isAdding || isUpdating ? 'Saving...' : editMode ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpensesPage;