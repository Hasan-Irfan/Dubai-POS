import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Filter, Edit, Trash2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  useGetVendorByIdQuery, 
  useGetVendorTransactionsQuery,
  useAddVendorTransactionMutation,
  useUpdateVendorTransactionMutation,
  useDeleteVendorTransactionMutation
} from '@/api/vendorApis';
import {
  setTransactions,
  setTransactionPagination,
  setTransactionFilters,
  setTransactionDateRange,
} from '@/services/vendorSlice';

const initialTransactionForm = {
  type: 'Purchase',
  description: '',
  amount: '',
  method: 'Cash',
};

const VendorTransactionsPage = () => {
  const dispatch = useDispatch();
  const { vendorId } = useParams();
  const { toast } = useToast();

  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [transactionForm, setTransactionForm] = useState(initialTransactionForm);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Queries and Mutations
  const { data: vendor, error: vendorError, isLoading: vendorLoading } = useGetVendorByIdQuery(vendorId);
  const { data: transactionData, error: txnError, isLoading: txnLoading } = useGetVendorTransactionsQuery({
    vendorId,
    page: currentPage,
    limit: pageSize,
    from: dateRange.from ? new Date(dateRange.from).toISOString() : undefined,
    to: dateRange.to ? new Date(dateRange.to).toISOString() : undefined
  });
  const [addTransaction, { isLoading: isAdding }] = useAddVendorTransactionMutation();
  const [updateTransaction, { isLoading: isUpdating }] = useUpdateVendorTransactionMutation();
  const [deleteTransaction, { isLoading: isDeleting }] = useDeleteVendorTransactionMutation();

  // Update state from API response
  useEffect(() => {
    if (transactionData?.transactions) {
      dispatch(setTransactions(transactionData.transactions));
    }
    if (transactionData?.pagination) {
      dispatch(setTransactionPagination(transactionData.pagination));
    }
  }, [transactionData, dispatch]);

  // Form Handlers
  const handleFormChange = (key, value) => {
    setTransactionForm(prev => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (key, value) => {
    // Convert the date to ISO 8601 format for API
    const isoDate = value ? new Date(value).toISOString() : '';
    setDateRange(prev => ({ ...prev, [key]: value })); // Keep the original format for display
    dispatch(setTransactionDateRange({ [key]: isoDate })); // Send ISO format to API
  };

  const openAddDialog = () => {
    setTransactionForm(initialTransactionForm);
    setEditMode(false);
    setDialogOpen(true);
  };

  const openEditDialog = (transaction) => {
    setTransactionForm({
      description: transaction.description,
    });
    setSelectedTransaction(transaction);
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTransaction(null);
    setTransactionForm(initialTransactionForm);
  };

  const handleSave = async () => {
    try {
      if (editMode && selectedTransaction) {
        await updateTransaction({
          id: selectedTransaction._id,
          description: transactionForm.description,
        }).unwrap();
        toast({ title: 'Success', description: 'Transaction updated successfully' });
      } else {
        await addTransaction({
          vendorId,
          ...transactionForm,
          amount: Number(transactionForm.amount),
        }).unwrap();
        toast({ title: 'Success', description: 'Transaction added successfully' });
      }
      handleDialogClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || error.message || 'Failed to save transaction',
      });
    }
  };

  const handleDelete = async (transactionId) => {
    try {
      await deleteTransaction({ id: transactionId, vendorId }).unwrap();
      toast({ title: 'Success', description: 'Transaction deleted successfully' });
    } catch (error) {
      toast({ 
        variant: 'destructive',
        title: 'Error', 
        description: error.data?.message || error.message || 'Failed to delete transaction',
      });
    }
  };

  if (vendorLoading || txnLoading) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Loading...</h1>
        <Button asChild>
          <Link to="/vendors"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Vendors</Link>
        </Button>
      </div>
    );
  }

  if (vendorError || !vendor || txnError) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4">Error Loading Data</h1>
        <p className="text-muted-foreground mb-4">
          {vendorError?.data?.message || txnError?.data?.message || 'Failed to load data'}
        </p>
        <Button asChild>
          <Link to="/vendors"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Vendors</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button asChild variant="outline" className="mb-2">
            <Link to="/vendors"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Vendors</Link>
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
            Transactions for {vendor.name}
          </h1>
          <p className="text-muted-foreground">Contact: {vendor.contact?.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div>
              <Label>From</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateRangeChange('from', e.target.value)}
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateRangeChange('to', e.target.value)}
              />
            </div>
          </div>
          <Button onClick={openAddDialog}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Transaction
          </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>View and manage all transactions for this vendor.</CardDescription>
        </CardHeader>
        <CardContent>
          {!transactionData?.transactions?.length ? (
            <div className="h-96 flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">No transactions found for this vendor.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionData.transactions.map((txn) => (
                  <TableRow key={txn._id}>
                    <TableCell>{new Date(txn.date).toLocaleDateString()}</TableCell>
                    <TableCell>{txn.type}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className={txn.type === 'Purchase' ? 'text-destructive' : 'text-green-600'}>
                      {txn.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{txn.balance.toFixed(2)}</TableCell>
                    <TableCell>{txn.method || 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(txn)} className="hover:text-yellow-500">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(txn._id)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editMode && (
              <>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={transactionForm.type}
                    onValueChange={(value) => handleFormChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Purchase">Purchase</SelectItem>
                      <SelectItem value="Payment">Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => handleFormChange('amount', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={transactionForm.method}
                    onValueChange={(value) => handleFormChange('method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank</SelectItem>
                      <SelectItem value="Shabka">Shabka</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label>Description</Label>
              <Input
                value={transactionForm.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Transaction description"
              />
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

export default VendorTransactionsPage;
