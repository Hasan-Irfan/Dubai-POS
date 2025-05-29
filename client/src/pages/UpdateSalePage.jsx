import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Minus, Save } from 'lucide-react';
import { useGetInvoiceByIdQuery, useUpdateInvoiceMutation } from '@/api/salesApi';

const initialItemState = {
  description: '',
  quantity: 1,
  unitPrice: 0,
  costPrice: 0,
  vatAmount: 0,
};

const UpdateSalePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [updateInvoice] = useUpdateInvoiceMutation();
  const { data: invoiceData, isLoading } = useGetInvoiceByIdQuery(id);

  const [formData, setFormData] = useState({
    customerName: '',
    items: [{ ...initialItemState }],
  });

  // Initialize form data when invoice data is loaded
  useEffect(() => {
    if (invoiceData) {
      setFormData({
        customerName: invoiceData.customerName,
        items: invoiceData.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          vatAmount: item.vatAmount || 0,
        })),
      });
    }
  }, [invoiceData]);

  const calculateTotals = () => {
    const subTotal = formData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const totalVat = formData.items.reduce(
      (sum, item) => sum + (item.vatAmount || 0),
      0
    );
    const grandTotal = subTotal + totalVat;
    const totalCost = formData.items.reduce(
      (sum, item) => sum + item.quantity * item.costPrice,
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const numValue = field === 'description' ? value : Number(value);
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: numValue } : item
      ),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialItemState }],
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    if (!formData.customerName) {
      throw new Error('Customer name is required');
    }
    if (!formData.items.length) {
      throw new Error('At least one item is required');
    }

    formData.items.forEach((item, index) => {
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
    });

    const totals = calculateTotals();
    if (totals.grandTotal <= 0) {
      throw new Error('Invoice total must be greater than zero');
    }
  };

  const handleSubmit = async () => {
    try {
      validateForm();

      await updateInvoice({
        id,
        ...formData
      }).unwrap();

      toast({
        title: 'Success',
        description: 'Invoice updated successfully',
      });
      navigate('/sales');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.data?.message || error.message || 'Failed to update invoice',
      });
    }
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
        <h1 className="text-3xl font-bold">Update Sale</h1>
        <Button variant="outline" onClick={() => navigate('/sales')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Update the invoice information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name*</Label>
              <Input
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="e.g. John Doe"
              />
            </div>
          </div>

          {/* Items */}
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
                {formData.items.map((item, index) => (
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
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, 'unitPrice', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.costPrice}
                        onChange={(e) =>
                          handleItemChange(index, 'costPrice', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.vatAmount}
                        onChange={(e) =>
                          handleItemChange(index, 'vatAmount', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {((item.quantity * item.unitPrice) + (item.vatAmount || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
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
            <Save className="h-4 w-4 mr-2" /> Update Invoice
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UpdateSalePage;