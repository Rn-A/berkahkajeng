import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, ShieldAlert, Edit, Trash2, Save, X, Search, Lock, Unlock, Key, AtSign, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Account {
  id: number;
  username: string;
  role: 'owner' | 'mandor';
  full_name: string;
  created_at: string;
}

interface UserManagementViewProps {
  auth: any;
  onDeleteUser: (id: number, username: string) => Promise<void>;
}

export default function UserManagementView({ auth, onDeleteUser }: UserManagementViewProps) {
  const [users, setUsers] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: 0, username: '', full_name: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${auth.user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (isEditing && formData.id) {
        const res = await fetch(`/api/users/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${auth.user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal update');
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal menambah mandor');
        }
      }
      setIsEditing(false);
      setFormData({ id: 0, username: '', full_name: '', password: '' });
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleEdit = (u: Account) => {
    setFormData({ id: u.id, username: u.username, full_name: u.full_name, password: '' });
    setIsEditing(true);
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-xl">
              <UserCheck className="text-green-500" size={28} />
            </div>
            Manajemen Akun Mandor
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Kelola hak akses dan identitas staff operasional pangkalan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none sticky top-8"
          >
            <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center gap-3">
              {isEditing ? <Edit size={22} className="text-amber-500" /> : <UserPlus size={22} className="text-green-500" />}
              {isEditing ? 'Edit Informasi Akun' : 'Tambah Mandor Baru'}
            </h2>
            
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm border border-red-200 dark:border-red-800/30 flex items-center gap-3"
                >
                  <ShieldAlert size={18} className="shrink-0" />
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <User size={12} />
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none transition-all"
                  placeholder="Misal: Budi Santoso"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <AtSign size={12} />
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                  className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none font-mono transition-all"
                  placeholder="misal: budimandor"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Key size={12} />
                  Password {isEditing && <span className="text-zinc-400 lowercase font-normal italic">(Reset?)</span>}
                </label>
                <input
                  type="text"
                  required={!isEditing}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-green-500 dark:text-white outline-none transition-all"
                  placeholder={isEditing ? "Kosongkan jika tidak ganti" : "Masukkan password awal"}
                />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-zinc-900/10"
                >
                  <Save size={20} />
                  {isEditing ? 'Simpan Perubahan' : 'Daftarkan Mandor'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({ id: 0, username: '', full_name: '', password: '' });
                      setErrorMsg('');
                    }}
                    className="w-full px-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
                  >
                    Batalkan Edit
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <h2 className="text-xl font-bold dark:text-white">Daftar Akun Terdaftar</h2>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari nama atau username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-5 py-3 w-full text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none dark:text-white transition-all"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-green-500 rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-zinc-500">Memuat data pengguna...</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-8 px-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Info Pengguna</th>
                      <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Akses</th>
                      <th className="py-4 px-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Manajemen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    <AnimatePresence mode="popLayout">
                      {filteredUsers.map(u => (
                        <motion.tr 
                          key={u.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
                        >
                          <td className="py-5 px-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-lg">
                                {u.full_name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold dark:text-white">{u.full_name}</span>
                                <span className="text-xs text-zinc-400 font-mono">@{u.username}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-4">
                            <div className="flex flex-col gap-1.5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold tracking-widest uppercase w-max ${
                                u.role === 'owner' 
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {u.role === 'owner' ? <Unlock size={12} /> : <Lock size={12} />}
                                {u.role}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-medium">
                                Sejak {new Date(u.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {u.role !== 'owner' ? (
                                <>
                                  <button
                                    onClick={() => handleEdit(u)}
                                    className="p-3 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all active:scale-90"
                                    title="Edit Informasi"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await onDeleteUser(u.id, u.username);
                                      fetchUsers();
                                    }}
                                    className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-90"
                                    title="Hapus Akun"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-lg">Admin Utama</span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-4 text-zinc-400">
                            <Search size={48} className="opacity-10" />
                            <p className="font-medium">Tidak ada mandor yang sesuai pencarian.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
