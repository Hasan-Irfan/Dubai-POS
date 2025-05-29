import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
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
  PlusCircle,
  Search,
  Edit,
  Trash2,
  CreditCard,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
} from 'lucide-react';
import {
  useGetAllInvoicesQuery,
  useDeleteInvoiceMutation,
  useAddPaymentMutation,
  useReversePaymentMutation,
  useGetInvoiceByIdQuery,
} from '@/api/salesApi';
import {
  setFilters,
  setDateRange,
  setPagination,
  removeInvoiceFromState,
  addPaymentToInvoice,
  removePaymentFromInvoice,
  resetFilters,
  setInvoices,
} from '@/services/salesSlice';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useGetEmployeesQuery } from '@/api/employeeApi';

const SalesHistoryPage = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  
  // Local state for search and pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    customerName: '',
    salesmanId: '',
    status: 'all',
    dateRange: { from: '', to: '' }
  });

  // Get data with search parameters
  const { data, isLoading, error } = useGetAllInvoicesQuery({
    page: currentPage,
    limit: pageSize,
    status: filters.status,
    customerName: filters.customerName,
    salesmanId: filters.salesmanId,
    from: filters.dateRange.from,
    to: filters.dateRange.to
  });

  // Get employees data
  const { data: employeesData } = useGetEmployeesQuery();
  const employeesMap = React.useMemo(() => {
    if (!employeesData?.employees) return {};
    return employeesData.employees.reduce((acc, emp) => {
      acc[emp._id] = emp.name;
      return acc;
    }, {});
  }, [employeesData?.employees]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || 'Failed to fetch invoices',
      });
    }
  }, [error, toast]);

  // Handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { ...prev.dateRange, [key]: value }
    }));
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
  };

  // Query and mutations
  const [deleteInvoice, { isLoading: isDeleting }] = useDeleteInvoiceMutation();
  const [addPayment, { isLoading: isAddingPayment }] = useAddPaymentMutation();
  const [reversePayment, { isLoading: isReversingPayment }] = useReversePaymentMutation();

  // Update state from API response
  useEffect(() => {
    if (data?.invoices) {
      dispatch(setInvoices(data.invoices));
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

  // Local state for dialogs
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [reverseDialog, setReverseDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'Cash'
  });
  const [reverseReason, setReverseReason] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);

  // Query for full invoice details
  const { data: invoiceDetails, isLoading: detailsLoading } = useGetInvoiceByIdQuery(
    viewInvoiceId,
    { skip: !viewInvoiceId }
  );

  // Handlers
  const handleDelete = async (id) => {
    try {
      await deleteInvoice(id).unwrap();
      dispatch(removeInvoiceFromState(id));
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || error.message || 'Failed to delete invoice',
      });
    }
  };

  const handleAddPayment = async () => {
    try {
      const result = await addPayment({
        id: selectedInvoice._id,
        ...paymentData,
      }).unwrap();

      dispatch(addPaymentToInvoice({
        invoiceId: selectedInvoice._id,
        payment: result.payment
      }));

      setPaymentDialog(false);
      setPaymentData({ amount: '', method: 'Cash' });
      toast({
        title: 'Success',
        description: 'Payment added successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || error.message || 'Failed to add payment',
      });
    }
  };

  const handleReversePayment = async () => {
    try {
      await reversePayment({
        invoiceId: selectedInvoice._id,
        paymentId: selectedPayment.id,
        reason: reverseReason,
      }).unwrap();

      dispatch(removePaymentFromInvoice({
        invoiceId: selectedInvoice._id,
        paymentId: selectedPayment.id
      }));

      setReverseDialog(false);
      setReverseReason('');
      setSelectedPayment(null);
      toast({
        title: 'Success',
        description: 'Payment reversed successfully',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || error.message || 'Failed to reverse payment',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Partially Paid':
        return 'warning';
      case 'Unpaid':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Helper function to safely format currency
  const formatCurrency = (amount) => {
    return amount ? amount.toFixed(2) : '0.00';
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
        <h1 className="text-3xl font-bold">Sales History</h1>
        <Button asChild>
          <Link to="/sale/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Sale
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
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
            <div>
              <Label>Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by customer name..."
                  className="pl-8"
                  value={filters.customerName}
                  onChange={(e) => handleFilterChange('customerName', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Search Salesman</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by salesman name..."
                  className="pl-8"
                  value={filters.salesmanId}
                  onChange={(e) => handleFilterChange('salesmanId', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales List</CardTitle>
          <CardDescription>
            Showing {data?.pagination.total} total sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Salesman</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.invoices.map((invoice) => (
                <TableRow key={invoice._id}>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    {format(new Date(invoice.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{invoice.salesmanId?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {invoice.totals.grandTotal.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const totalPaid = invoice.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                      const payable = invoice.totals.grandTotal - totalPaid;
                      return `${payable.toFixed(2)}`;
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setViewInvoiceId(invoice._id);
                          setViewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link to={`/sale/${invoice._id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setPaymentDialog(true);
                        }}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(invoice._id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></span>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {data?.pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!data?.pagination.hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!data?.pagination.hasNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Add a payment for invoice #{selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) =>
                  setPaymentData({ ...paymentData, amount: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={paymentData.method}
                onValueChange={(value) =>
                  setPaymentData({ ...paymentData, method: value })
                }
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)} disabled={isAddingPayment}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment} disabled={isAddingPayment}>
              {isAddingPayment ? (
                <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></span>Processing...</span>
              ) : (
                'Add Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Payment Dialog */}
      <Dialog open={reverseDialog} onOpenChange={setReverseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Payment</DialogTitle>
            <DialogDescription>
              Provide a reason for reversing this payment
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason</Label>
            <Input
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseDialog(false)} disabled={isReversingPayment}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReversePayment} disabled={isReversingPayment}>
              {isReversingPayment ? (
                <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></span>Reversing...</span>
              ) : (
                'Reverse Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update View Invoice Dialog */}
      <Dialog open={viewDialog} onOpenChange={(open) => {
        setViewDialog(open);
        if (!open) setViewInvoiceId(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Full details for invoice #{invoiceDetails?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : invoiceDetails ? (
            <div className="overflow-y-auto pr-4">
              <div className="space-y-6">
                {/* Header Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Invoice Information</h4>
                    <div className="space-y-1">
                      <p><span className="font-medium">Invoice #:</span> {invoiceDetails.invoiceNumber}</p>
                      <p><span className="font-medium">Date:</span> {invoiceDetails.date ? format(new Date(invoiceDetails.date), 'dd/MM/yyyy') : 'N/A'}</p>
                      <p><span className="font-medium">Status:</span> {invoiceDetails.status || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Customer Information</h4>
                    <div className="space-y-1">
                      <p><span className="font-medium">Name:</span> {invoiceDetails.customerName || 'N/A'}</p>
                      <p><span className="font-medium">Salesman:</span> {invoiceDetails.salesmanId?.name || 'N/A'}</p>
                      {invoiceDetails.salesmanId?.contact && (
                        <>
                          <p><span className="font-medium">Contact:</span> {invoiceDetails.salesmanId.contact.phone || 'N/A'}</p>
                          <p><span className="font-medium">Email:</span> {invoiceDetails.salesmanId.contact.email || 'N/A'}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                {invoiceDetails.items && invoiceDetails.items.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetails.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description || 'N/A'}</TableCell>
                            <TableCell>{item.quantity || 0}</TableCell>
                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
              <TableCell>{formatCurrency(item.lineTotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Totals */}
                {invoiceDetails.totals && (
                  <div className="space-y-2">
                    <h4 className="font-semibold mb-2">Totals</h4>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(invoiceDetails.totals.subTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({invoiceDetails.totals.totalVat || 0}%):</span>
                      <span>{formatCurrency(invoiceDetails.totals.vat)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(invoiceDetails.totals.grandTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Payments */}
                {invoiceDetails.payments && invoiceDetails.payments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Payments</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetails.payments.map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell>{payment.date ? format(new Date(payment.date), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>{payment.method || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={payment.reversed ? 'destructive' : 'success'}>
                                {payment.reversed ? 'Reversed' : 'Active'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Failed to load invoice details
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesHistoryPage;
  