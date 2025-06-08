import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
} from "@/api/userApi";
import { setUsers, setError } from "@/services/userSlice";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const UsersPage = () => {
  const dispatch = useDispatch();
  const { data, error, isLoading } = useGetUsersQuery();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const { users, role: currentUserRole } = useSelector((state) => state.user);

  const [editingUserId, setEditingUserId] = useState(null);
  const [updatedUser, setUpdatedUser] = useState({ username: "", email: "", role: "" });
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    if (data?.users) dispatch(setUsers(data.users));
    if (error) {
      const errorMessage =
        error?.data?.message || error?.message || "Failed to fetch users.";
      dispatch(setError(errorMessage));
    }
  }, [data, error, dispatch]);

  const handleDelete = async (id) => {
    try {
      await deleteUser(id).unwrap();
    } catch (err) {
      dispatch(setError(err?.data?.message || err?.message || "Delete failed."));
    }
  };

  const handleEditClick = (user) => {
    setEditingUserId(user._id);
    setUpdatedUser({ username: user.username, email: user.email, role: user.role });
    setUpdateError("");
  };

  const handleUpdate = async (id) => {
    try {
      await updateUser({ id, ...updatedUser }).unwrap();
      setEditingUserId(null);
      setUpdateError("");
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Update failed.";
      setUpdateError(msg);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      {isLoading ? (
        <p>Loading users...</p>
      ) : error ? (
        <p className="text-red-500">
          Error: {error?.data?.message || error?.message}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user._id}</TableCell>
                  <TableCell>
                    {editingUserId === user._id ? (
                      <Input
                        value={updatedUser.username}
                        onChange={(e) =>
                          setUpdatedUser((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      user.username
                    )}
                  </TableCell>
                  <TableCell>
                    {editingUserId === user._id ? (
                      <Input
                        value={updatedUser.role}
                        onChange={(e) =>
                          setUpdatedUser((prev) => ({
                            ...prev,
                            role: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      user.role
                    )}
                  </TableCell>
                  <TableCell>
                    {editingUserId === user._id ? (
                      <Input
                        value={updatedUser.email}
                        onChange={(e) =>
                          setUpdatedUser((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      user.email
                    )}
                  </TableCell>
                  <TableCell className="space-x-2">
                    {editingUserId === user._id ? (
                      <>
                        <Button onClick={() => handleUpdate(user._id)} size="sm">
                          Save
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingUserId(null);
                            setUpdateError("");
                          }}
                        >
                          Cancel
                        </Button>
                        {updateError && (
                          <div className="text-red-500 text-xs mt-1">{updateError}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <Button onClick={() => handleEditClick(user)} size="sm">
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(user._id)}
                          size="sm"
                          disabled={currentUserRole !== "superAdmin"}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Button className="mt-4">Add User</Button>
    </div>
  );
};

export default UsersPage;
