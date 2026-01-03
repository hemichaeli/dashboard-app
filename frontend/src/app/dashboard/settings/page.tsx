'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Bell, Palette, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';

export default function SettingsPage() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', department: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) setProfileForm({ name: user.name || '', email: user.email || '', phone: user.phone || '', department: user.department || '' });
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await authApi.updateProfile(profileForm);
      checkAuth();
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error: any) { setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' }); } finally { setLoading(false); }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setMessage({ type: 'error', text: 'Passwords do not match' }); return; }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully' });
    } catch (error: any) { setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' }); } finally { setLoading(false); }
  };

  const tabs = [{ id: 'profile', label: 'Profile', icon: User }, { id: 'security', label: 'Security', icon: Lock }, { id: 'notifications', label: 'Notifications', icon: Bell }, { id: 'appearance', label: 'Appearance', icon: Palette }];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-gray-500">Manage your account settings</p></div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 bg-white rounded-xl shadow-sm p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><tab.icon size={20} /><span>{tab.label}</span></button>
            ))}
          </nav>
        </div>
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6">
          {message.text && <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>{message.text}</div>}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input type="text" value={profileForm.department} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading && <Loader2 className="animate-spin" size={16} />}Save Changes</button>
            </form>
          )}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <div className="space-y-4 max-w-md">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label><input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label><input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label><input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
              </div>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading && <Loader2 className="animate-spin" size={16} />}Update Password</button>
            </form>
          )}
          {activeTab === 'notifications' && <div><h2 className="text-lg font-semibold mb-4">Notification Preferences</h2><p className="text-gray-500">Notification settings coming soon.</p></div>}
          {activeTab === 'appearance' && <div><h2 className="text-lg font-semibold mb-4">Appearance Settings</h2><p className="text-gray-500">Theme and appearance settings coming soon.</p></div>}
        </div>
      </div>
    </div>
  );
}