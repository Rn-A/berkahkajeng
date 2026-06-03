import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Users, Plus, Search, Phone, MapPin, X, Save, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Supplier } from '../types';
import { cn, generateUUID } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SuppliersViewProps {
  suppliers: Supplier[];
  onSave: (supplier: Supplier) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function SuppliersView({ suppliers, onSave, onDelete }: SuppliersViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [formData, setFormData] = useState<Supplier>({
    id: '',
    name: '',
    phone: '',
    address: ''
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSuppliers.slice(indexOfFirstItem, indexOfLastItem);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({ id: generateUUID(), name: '', phone: '', address: '' });
    setShowForm(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setFormData(supplier);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({ id: '', name: '', phone: '', address: '' });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Daftar Supplier</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm">Kelola data pemasok kayu Anda.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          Tambah Supplier
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          type="text"
          placeholder="Cari nama atau telepon..."
          className={cn("input-field w-full !pl-12")}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {currentItems.map((supplier) => (
            <motion.div 
              key={supplier.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(supplier)}
                    className="p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => onDelete(supplier.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">{supplier.name}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <Phone size={16} />
                  <span>{supplier.phone || '-'}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span>{supplier.address || '-'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-900 transition-all"
          >
            <ChevronLeft size={20} className="dark:text-white" />
          </button>
          <span className="text-sm font-bold dark:text-white">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 disabled:opacity-30 hover:bg-white dark:hover:bg-zinc-900 transition-all"
          >
            <ChevronRight size={20} className="dark:text-white" />
          </button>
        </div>
      )}

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          <Users size={48} className="mx-auto mb-4 opacity-10" />
          <p>Tidak ada supplier yang ditemukan.</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" 
              onClick={resetForm} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold dark:text-white">
                  {editingId ? 'Edit Supplier' : 'Tambah Supplier Baru'}
                </h2>
                <button onClick={resetForm} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X size={20} className="dark:text-zinc-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Nama Supplier</label>
                  <input 
                    required
                    type="text"
                    className="input-field w-full"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Nomor Telepon</label>
                  <input 
                    type="text"
                    className="input-field w-full"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Alamat</label>
                  <textarea 
                    className="input-field w-full h-24 resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-lg shadow-zinc-900/10 active:scale-95 transition-all">
                  <Save size={20} />
                  {editingId ? 'Update Supplier' : 'Simpan Supplier'}
                </button>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
