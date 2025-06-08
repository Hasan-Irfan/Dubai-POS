import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useChangePasswordMutation } from '@/api/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const ProfilePage = () => {
  const { toast } = useToast();
  const userState = useSelector((state) => state.user);
  const username = userState.username || localStorage.getItem('username') || '';
  const email = userState.email || localStorage.getItem('email') || '';
  const role = userState.role || localStorage.getItem('role') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePassword, { isLoading: isUpdating }] = useChangePasswordMutation();

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in both password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters long.' });
      return;
    }
   
    try {
      await changePassword(newPassword).unwrap();
      toast({ title: 'Success', description: 'Password changed successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Update error:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.data?.message || error.message });
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="space-y-4 mb-8">
        <div>
          <Label>Username</Label>
          <Input value={username} readOnly disabled />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={email} readOnly disabled />
        </div>
        <div>
          <Label>Role</Label>
          <Input value={role} readOnly disabled />
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-2">Change Password</h2>
        <form onSubmit={handleUpdateProfile} className="space-y-2">
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Change Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
  