import React, { useState } from 'react';
import { LogIn, User, Lock, AlertCircle, TreeDeciduous } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoginProps {
  onLogin: (credentials: any) => Promise<void>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onLogin({ username, password });
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa username dan password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-8 bg-zinc-900 dark:bg-zinc-950 text-white text-center">
            <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4 bg-black rounded-2xl p-2">
              <img src="/logo.png" alt="Berkah Kajeng Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold">Berkah Kajeng</h1>
            <p className="text-zinc-400 text-sm mt-1">Sistem Manajemen Pangkalan Kayu</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
                  <AlertCircle size={20} />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Username</label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 text-zinc-400 z-10" size={20} />
                  <input
                    type="text"
                    required
                    className={cn("input-field w-full !pl-14 h-12 relative")}
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Password</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-zinc-400 z-10" size={20} />
                  <input
                    type="password"
                    required
                    className={cn("input-field w-full !pl-14 h-12 relative")}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "btn-primary w-full h-14 text-lg flex items-center justify-center gap-3 shadow-sm",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <LogIn size={24} />
                {isLoading ? 'Memproses...' : 'Masuk ke Sistem'}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-center text-xs text-zinc-400">
                Gunakan akun <strong>owner</strong> atau <strong>mandor</strong> untuk masuk.
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-zinc-400 text-xs">
          &copy; 2026 Berkah Kajeng. All rights reserved.
        </p>
      </div>
    </div>
  );
}
