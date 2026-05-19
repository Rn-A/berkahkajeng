import React, { useState } from 'react';
import { User, Lock, Save, ShieldCheck, AlertCircle } from 'lucide-react';
import { AuthState } from '../types';

interface ProfileViewProps {
  auth: AuthState;
  onUpdateAuth: (newData: any) => void;
}

export default function ProfileView({ auth, onUpdateAuth }: ProfileViewProps) {
  const [formData, setFormData] = useState({
    full_name: auth.user?.full_name || '',
    username: auth.user?.username || '',
    email: auth.user?.email || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validasi input password
    if (formData.new_password) {
      if (!formData.current_password) {
        return setMessage({ type: 'error', text: 'Password saat ini harus diisi untuk mengubah password baru.' });
      }
      if (formData.new_password !== formData.confirm_password) {
        return setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      }
      if (formData.new_password.length < 6) {
        return setMessage({ type: 'error', text: 'Password baru minimal 6 karakter.' });
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          username: formData.username,
          email: formData.email,
          current_password: formData.current_password,
          new_password: formData.new_password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui profil.');
      }

      setMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
      
      // Update the local auth state
      if (data.user) {
        onUpdateAuth(data.user);
      }

      // Reset password fields
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <User className="text-green-500" />
          Pengaturan Profil
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Perbarui informasi profil dan kata sandi Anda di sini.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm">
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'error' 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30' 
              : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/30'
          }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <ShieldCheck size={20} />}
            <p className="font-medium text-sm">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`grid gap-6 ${auth.user?.role === 'owner' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-lg mx-auto'}`}>
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <User size={16} className="text-zinc-400" />
                Info Dasar
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none font-mono transition-all"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Gunakan huruf kecil tanpa spasi.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Alamat Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none transition-all"
                  placeholder="admin@example.com"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Digunakan untuk fitur Lupa Sandi.</p>
              </div>
            </div>

            </div>

            {auth.user?.role === 'owner' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                  <Lock size={16} className="text-zinc-400" />
                  Ubah Password
                </h3>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Password Saat Ini
                  </label>
                  <input
                    type="password"
                    value={formData.current_password}
                    onChange={e => setFormData({...formData, current_password: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none transition-all"
                    placeholder="Isi jika ingin ganti password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    value={formData.new_password}
                    onChange={e => setFormData({...formData, new_password: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none transition-all"
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    value={formData.confirm_password}
                    onChange={e => setFormData({...formData, confirm_password: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none transition-all"
                    placeholder="Ketik ulang password baru"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
