import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Edit,
  Trash2,
  Users2,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSelector, useDispatch } from "react-redux";
import {
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
} from "@/api/employeeApi";
import { setEmployees, setLoading, setError } from "@/services/employeeSlice";

const EmployeesPage = () => {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { employees } = useSelector((state) => state.employee);

  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Update the query to include pagination and search params
  const { data, isLoading, error, refetch } = useGetEmployeesQuery({
    page: currentPage,
    limit: pageSize,
    search, // Add search to the API query
  });

  const [createEmployee] = useCreateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const [updateEmployee] = useUpdateEmployeeMutation();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact: { email: "", phone: "", address: "" },
    role: "salesman",
    salary: "",
  });
  const [editModeId, setEditModeId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    if (data?.employees) dispatch(setEmployees(data.employees));
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
      if (name in editFormData.contact) {
        setEditFormData((prev) => ({
          ...prev,
          contact: { ...prev.contact, [name]: value },
        }));
      } else {
        setEditFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      if (name in formData.contact) {
        setFormData((prev) => ({
          ...prev,
          contact: { ...prev.contact, [name]: value },
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
  };

  const handleCreateEmployee = async () => {
    try {
      const employeeData = {
        name: formData.name,
        contact: {
          email: formData.contact.email,
          phone: formData.contact.phone,
          address: formData.contact.address,
        },
        role: formData.role,
        salary: formData.salary,
      };
      await createEmployee({ employeeData }).unwrap();
      toast({ title: "Employee Created" });
      setFormData({
        name: "",
        contact: { email: "", phone: "", address: "" },
        role: "salesman",
        salary: "",
      });
      setShowForm(false);
      refetch();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err?.message || err?.data?.message || "Failed to create employee",
      });
    }
  };

  const handleUpdateEmployee = async (id) => {
    try {
      const updateData = {
        ...editFormData,
        "contact.email": editFormData.contact.email,
        "contact.phone": editFormData.contact.phone,
        "contact.address": editFormData.contact.address,
      };
      delete updateData.contact;
      await updateEmployee({ id, ...updateData }).unwrap();
      toast({ title: "Employee Updated" });
      setEditModeId(null);
      refetch();
    } catch (err) {
      toast({
        title: "Error",
        description: err?.data?.message || "Failed to update employee",
      });
    }
  };

  const handleDeleteEmployee = async (id) => {
    try {
      await deleteEmployee(id).unwrap();
      toast({ title: "Employee Deleted" });
      refetch();
    } catch (err) {
      toast({
        title: "Error",
        description: err?.data?.message || "Failed to delete employee",
      });
    }
  };

  const handleStartEdit = (employee) => {
    setEditModeId(employee._id);
    setEditFormData({
      name: employee.name,
      contact: { ...employee.contact },
      role: employee.role,
      hireDate: employee.hireDate?.split("T")[0],
      salary: employee.salary,
    });
  };

  const getStatusVariant = (status) =>
    status === "active" ? "default" : "secondary";

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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-500 to-emerald-500 text-transparent bg-clip-text">
          Employee Management
        </h1>
        <div className="flex gap-2">
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setShowForm(!showForm)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Employee
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Employee</CardTitle>
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
                  name="email"
                  value={formData.contact.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  name="phone"
                  value={formData.contact.phone}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  name="address"
                  value={formData.contact.address}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label>Role</Label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full border rounded-md h-10 px-2 text-black dark:text-white bg-white dark:bg-gray-800"
                >
                  <option value="salesman">Salesman</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
              <div>
                <Label>Salary</Label>
                <Input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <Button onClick={handleCreateEmployee}>Create Employee</Button>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            Manage your team members and their details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/20">
              <Users2 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                No employees found.
              </p>
              <p className="text-sm text-muted-foreground">
                Click "Add New Employee" to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee._id}>
                    {editModeId === employee._id ? (
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
                            name="email"
                            value={editFormData.contact.email}
                            onChange={(e) => handleInputChange(e, true)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            name="phone"
                            value={editFormData.contact.phone}
                            onChange={(e) => handleInputChange(e, true)}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            name="role"
                            value={editFormData.role}
                            onChange={(e) => handleInputChange(e, true)}
                            className="w-full border rounded-md h-10 px-2"
                          >
                            <option value="salesman">Salesman</option>
                            <option value="regular">Regular</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(employee.status)}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUpdateEmployee(employee._id)}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{employee.name}</TableCell>
                        <TableCell>{employee.contact?.email}</TableCell>
                        <TableCell>{employee.contact?.phone}</TableCell>
                        <TableCell>{employee.role}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(employee.status)}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEmployee(employee._id)}
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

export default EmployeesPage;
