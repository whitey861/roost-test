import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        api.getStats(),
        api.getUsers()
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(newUser);
      setShowCreateUser(false);
      setNewUser({ email: '', name: '', password: '', role: 'user' });
      loadData();
    } catch (err) {
      alert('Failed to create user: ' + err.message);
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      if (isActive) {
        await api.deactivateUser(userId);
      } else {
        await api.updateUser(userId, { is_active: true });
      }
      loadData();
    } catch (err) {
      alert('Failed to update user: ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={() => setShowCreateUser(!showCreateUser)}>
          {showCreateUser ? 'Cancel' : 'Create User'}
        </Button>
      </div>

      {showCreateUser && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="w-full border rounded-md px-3 py-2"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <Button type="submit">Create User</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{stats?.platform.total_users || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl">{stats?.platform.total_jobs || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Jobs</CardDescription>
            <CardTitle className="text-3xl">{stats?.platform.active_jobs || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Storage</CardDescription>
            <CardTitle className="text-2xl">{formatBytes(stats?.platform.total_bytes || 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Users</h2>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Files</th>
                  <th className="text-left p-4 font-medium">Storage</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.is_active ? 'success' : 'outline'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">{user.files_count || 0}</td>
                    <td className="p-4">{formatBytes(user.storage_bytes || 0)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
