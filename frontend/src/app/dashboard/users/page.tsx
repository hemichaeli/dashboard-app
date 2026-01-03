'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Users as UsersIcon } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { User, PaginatedResponse } from '@/types';
import { formatDate, cn, getInitials } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', status: 'active' });

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll({ page, limit: 10, role: roleFilter || undefined, status: statusFilter || undefined, search: search || undefined });
      const data = res.data as PaginatedResponse<User>;
      setUsers(data.data);
      setTotalPages(data.pagination.pages);
    } catch (error) { console.error('Failed to fetch users:', error); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) { await usersApi.update(editingUser.id, form); } else { await usersApi.create(form); }
      setShowModal(false);
      setEditingUser(null);
      setForm({ name: '', email: '', password: '', role: 'user', status: 'active' });
      fetchUsers();
    } catch (error) { console.error('Failed to save user:', error); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try { await usersApi.delete(id); fetchUsers(); } catch (error) { console.error('Failed to delete user:', error); }
  };

  const openEditModal = (user: User) => { setEditingUser(user); setForm({ name: user.name, email: user.email, password: '', role: user.role, status: user.status }); setShowModal(true); };

  const getRoleColor = (role: string) => { switch (role) { case 'admin': return 'bg-purple-100 text-purple-800'; case 'manager': return 'bg-blue-100 text-blue-800'; default: return 'bg-gray-100 text-gray-800'; } };
  const getStatusColor = (status: string) => { switch (status) { case 'active': return 'bg-green-100 text-green-800'; case 'inactive': return 'bg-gray-100 text-gray-800'; case 'suspended': return 'bg-red-100 text-red-800'; default: return 'bg-gray-100 text-gray-800'; } };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Users</h1><p className="text-gray-500">Manage user accounts</p></div>
        <button onClick={() => { setEditingUser(null); setForm({ name: '', email: '', password: '', role: 'user', status: 'active' }); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus size={20} /><span>Add User</span></button>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">All Roles</option><option value="user">User</option><option value="manager">Manager</option><option value="admin">Admin</option></select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : users.length === 0 ? <div className="bg-white rounded-xl shadow-sm p-12 text-center"><UsersIcon className="mx-auto text-gray-400 mb-4" size={48} /><h3 className="text-lg font-medium text-gray-900">No users found</h3></div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">{getInitials(user.name)}</div><div><div className="font-medium text-gray-900">{user.name}</div><div className="text-sm text-gray-500">{user.email}</div></div></div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRoleColor(user.role))}>{user.role}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(user.status))}>{user.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right"><button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800 mr-3"><Edit2 size={16} /></button><button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && <div className="flex justify-center gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-lg disabled:opacity-50">Previous</button><span className="px-4 py-2">Page {page} of {totalPages}</span><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 border rounded-lg disabled:opacity-50">Next</button></div>}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Add User'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
              {!editingUser && <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="user">User</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingUser ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}