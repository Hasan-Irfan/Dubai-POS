import React, { useState, useEffect } from 'react';
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
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
  Store,
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSelector, useDispatch } from 'react-redux';
import {
  useCreateVendorMutation,
  useDeleteVendorMutation,
  useGetAllVendorsQuery,
  useUpdateVendorMutation,
} from '@/api/vendorApis';
import { setVendors, setLoading, setError } from '@/services/vendorSlice';

const VendorsPage = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { vendors } = useSelector((state) => state.vendor);

  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  // Update the query to include pagination and search params
  const { data, isLoading, error, refetch } = useGetAllVendorsQuery({
    page: currentPage,
    limit: pageSize,
    search,
  });

  const [createVendor] = useCreateVendorMutation();
  const [deleteVendor] = useDeleteVendorMutation();
  const [updateVendor] = useUpdateVendorMutation();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: { email: '', phone: '', address: '' },
    openingBalance: 0,
  });
  const [editModeId, setEditModeId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    if (data?.vendors) dispatch(setVendors(data.vendors));
    if (isLoading) dispatch(setLoading(true));
    if (error) dispatch(setError(error));
  }, [data, isLoading, error, dispatch]);

  // Reset to first page when search or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const handleInputChange = (e, isEdit = false) => {
    const { name, value } = e.target;
    if (isEdit) {
      if (name.startsWith('contact.')) {
        const contactField = name.split('.')[1];
        setEditFormData((prev) => ({
          ...prev,
          contact: { ...prev.contact, [contactField]: value },
        }));
      } else {
        setEditFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      if (name.startsWith('contact.')) {
        const contactField = name.split('.')[1];
        setFormData((prev) => ({
          ...prev,
          contact: { ...prev.contact, [contactField]: value },
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
  };

  const handleCreateVendor = async () => {
    try {
      await createVendor(formData).unwrap();
      toast({ title: 'Vendor Created Successfully' });
      setFormData({
        name: '',
        contact: { email: '', phone: '', address: '' },
        openingBalance: 0,
      });
      setShowForm(false);
      refetch();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.data?.message || 'Failed to create vendor',
      });
    }
  };

  const handleUpdateVendor = async (id) => {
    try {
      await updateVendor({ id, ...editFormData }).unwrap();
      toast({ title: 'Vendor Updated Successfully' });
      setEditModeId(null);
      refetch();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.data?.message || 'Failed to update vendor',
      });
    }
  };

  const handleDeleteVendor = async (id) => {
    try {
      await deleteVendor(id).unwrap();
      toast({ title: 'Vendor Deleted Successfully' });
      refetch();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.data?.message || 'Failed to delete vendor',
      });
    }
  };

  const handleStartEdit = (vendor) => {
    setEditModeId(vendor._id);
    setEditFormData({
      name: vendor.name,
      contact: { ...vendor.contact },
      openingBalance: vendor.openingBalance,
    });
  };

  const handleCancelEdit = () => {
    setEditModeId(null);
    setEditFormData({});
  };

  const getStatusVariant = (status) => status === 'active' ? 'default' : 'secondary';

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
  };

  // Use server-side pagination data directly
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
          Vendor Management
        </h1>
        <div className="flex gap-2">
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setShowForm(!showForm)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Vendor
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Vendor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  name="contact.email"
                  value={formData.contact.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  name="contact.phone"
                  value={formData.contact.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  name="contact.address"
                  value={formData.contact.address}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  name="openingBalance"
                  value={formData.openingBalance}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <Button onClick={handleCreateVendor}>Create Vendor</Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Vendor List</CardTitle>
          <CardDescription>
            Manage your suppliers and their details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/20">
              <Store className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                No vendors found.
              </p>
              <p className="text-sm text-muted-foreground">
                Click "Add New Vendor" to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor._id}>
                    {editModeId === vendor._id ? (
                      <>
                        <TableCell>
                          <Input
                            name="name"
                            value={editFormData.name}
                            onChange={(e) => handleInputChange(e, true)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            name="contact.email"
                            value={editFormData.contact.email}
                            onChange={(e) => handleInputChange(e, true)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            name="contact.phone"
                            value={editFormData.contact.phone}
                            onChange={(e) => handleInputChange(e, true)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            name="contact.address"
                            value={editFormData.contact.address}
                            onChange={(e) => handleInputChange(e, true)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            name="openingBalance"
                            value={editFormData.openingBalance}
                            onChange={(e) => handleInputChange(e, true)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(vendor.status)}>
                            {vendor.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateVendor(vendor._id)}
                            className="hover:text-green-500"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="hover:text-yellow-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.contact?.email}</TableCell>
                        <TableCell>{vendor.contact?.phone}</TableCell>
                        <TableCell>{vendor.contact?.address}</TableCell>
                        <TableCell>{vendor.openingBalance?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(vendor.status)}>
                            {vendor.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button asChild variant="ghost" size="icon" className="hover:text-primary">
                            <Link to={`/vendors/${vendor._id}/transactions`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(vendor)}
                            className="hover:text-yellow-500"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVendor(vendor._id)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination Controls */}
        <CardFooter className="flex items-center justify-between border-t p-4">
          <div className="flex items-center space-x-2">
            <Label>Rows per page:</Label>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="border rounded-md h-8 px-2 text-black dark:text-white bg-white dark:bg-gray-800"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VendorsPage;