import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { useToast } from '@/components/ui/use-toast';
import { Plus, Minus, Save, ArrowLeft } from 'lucide-react';
import { useCreateInvoiceMutation } from '@/api/salesApi';
import { useGetEmployeesQuery } from '@/api/employeeApi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const initialItemState = {
  description: '',
  quantity: '1',
  unitPrice: '',
  costPrice: '',
  vatAmount: '',
};

const initialPaymentState = {
  amount: 0,
  method: 'Cash',
};

const NewSalePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [createInvoice] = useCreateInvoiceMutation();
  const { data: employees } = useGetEmployeesQuery();

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    customerName: '',
    salesmanId: '',
    items: [{ ...initialItemState }],
    payments: [], // Optional payments array
  });

  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState(initialPaymentState);

  const calculateTotals = () => {
    const subTotal = invoiceData.items.reduce(
      (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
      0
    );
    const totalVat = invoiceData.items.reduce(
      (sum, item) => sum + (parseFloat(item.vatAmount) || 0),
      0
    );
    const grandTotal = subTotal + totalVat;
    const totalCost = invoiceData.items.reduce(
      (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.costPrice) || 0),
      0
    );
    const totalProfit = subTotal - totalCost;

    return {
      subTotal,
      totalVat,
      grandTotal,
      totalCost,
      totalProfit,
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setInvoiceData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handlePaymentChange = (field, value) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPayment = () => {
    const amountNum = Number(paymentData.amount);
    if (!amountNum || amountNum <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Payment amount must be greater than zero',
      });
      return;
    }
    setInvoiceData(prev => ({
      ...prev,
      payments: [...prev.payments, { ...paymentData, amount: amountNum }]
    }));
    setPaymentData(initialPaymentState);
  };

  const removePayment = (index) => {
    setInvoiceData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

  const addItem = () => {
    setInvoiceData((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialItemState }],
    }));
  };

  const removeItem = (index) => {
    if (invoiceData.items.length > 1) {
      setInvoiceData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const validateInvoice = () => {
    if (!invoiceData.invoiceNumber) {
      throw new Error('Invoice number is required');
    }
    if (!invoiceData.customerName) {
      throw new Error('Customer name is required');
    }
    if (!invoiceData.salesmanId) {
      throw new Error('Salesman is required');
    }
    if (!invoiceData.items.length) {
      throw new Error('At least one item is required');
    }

    invoiceData.items.forEach((item, index) => {
      if (!item.description) {
        throw new Error(`Item ${index + 1} description is required`);
      }
      if (item.quantity <= 0) {
        throw new Error(`Item ${index + 1} quantity must be greater than zero`);
      }
      if (item.unitPrice < 0) {
        throw new Error(`Item ${index + 1} unit price cannot be negative`);
      }
      if (item.costPrice < 0) {
        throw new Error(`Item ${index + 1} cost price cannot be negative`);
      }
      if (item.vatAmount < 0) {
        throw new Error(`Item ${index + 1} VAT amount cannot be negative`);
      }
      if (parseFloat(item.unitPrice) < parseFloat(item.costPrice)) {
        throw new Error(`Item ${index + 1}: Unit price cannot be less than cost price`);
      }
    });

    const totals = calculateTotals();
    if (totals.grandTotal <= 0) {
      throw new Error('Invoice total must be greater than zero');
    }
  };

  const handleSubmit = async () => {
    try {
      validateInvoice();

      await createInvoice(invoiceData).unwrap();

      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });
      navigate('/sales');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || error.data?.message || 'Failed to create invoice',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">New Sale</h1>
        <Button variant="outline" onClick={() => navigate('/sales')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Enter the invoice information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number*</Label>
              <Input
                id="invoiceNumber"
                name="invoiceNumber"
                value={invoiceData.invoiceNumber}
                onChange={handleInputChange}
                placeholder="e.g. INV-2025-001"
              />
            </div>
            <div>
              <Label htmlFor="customerName">Customer Name*</Label>
              <Input
                id="customerName"
                name="customerName"
                value={invoiceData.customerName}
                onChange={handleInputChange}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <Label htmlFor="salesmanId">Salesman*</Label>
              <Select
                value={invoiceData.salesmanId}
                onValueChange={(value) =>
                  handleInputChange({ target: { name: 'salesmanId', value } })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select salesman" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <Label>Items*</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>VAT Amount</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, 'description', e.target.value)
                        }
                        placeholder="Item description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={item.costPrice}
                        onChange={(e) => handleItemChange(index, 'costPrice', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={item.vatAmount}
                        onChange={(e) => handleItemChange(index, 'vatAmount', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      {(((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)) + (parseFloat(item.vatAmount) || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={invoiceData.items.length === 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              variant="outline"
              className="mt-2"
              onClick={addItem}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>

          {/* Payment Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Payments (Optional)</Label>
              <Button
                variant="outline"
                onClick={() => setShowPayment(!showPayment)}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Payment
              </Button>
            </div>

            {showPayment && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => handlePaymentChange('amount', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select
                    value={paymentData.method}
                    onValueChange={(value) => handlePaymentChange('method', value)}
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
                <div className="flex items-end">
                  <Button onClick={addPayment}>Add</Button>
                </div>
              </div>
            )}

            {invoiceData.payments.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceData.payments.map((payment, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {typeof payment.amount === 'number' && !isNaN(payment.amount)
                          ? `${payment.amount.toFixed(2)}`
                : '0.00'}
                      </TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePayment(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{calculateTotals().subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total VAT:</span>
                <span>{calculateTotals().totalVat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Grand Total:</span>
                <span>{calculateTotals().grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => navigate('/sales')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" /> Create Invoice
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NewSalePage;
  