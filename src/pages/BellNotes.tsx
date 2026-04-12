import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowLeft, Trash2, ShoppingBasket, Clock, Search, Package2, ListTodo, MoreVertical, Edit2, AlertCircle, FileText, PackageX, StickyNote, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Note, Product } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const NoteCard = ({ note, onEdit, onDeleteClick, index }: { note: Note, onEdit: (n: Note) => void, onDeleteClick: (n: Note) => void, index: number }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <div className="bg-[#1A1A1A] rounded-3xl p-5 border border-white/[0.05] hover:border-primary/20 transition-all duration-300 flex items-stretch gap-4 relative group">
        {/* Accent line */}
        <div className="w-[3px] rounded-full bg-primary shrink-0 shadow-sm shadow-primary/30" />

        <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-base leading-snug">{note.itemName}</h3>
            {note.description && (
                <p className="text-white/25 text-sm mt-1.5 line-clamp-2 leading-relaxed">{note.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3">
                <span className="text-primary/80 font-bold text-xs bg-primary/10 px-2.5 py-1 rounded-lg">{note.quantity}</span>
                <span className="text-white/15 text-[10px] font-medium flex items-center gap-1.5">
                   <Clock className="w-3 h-3" />
                   {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(note.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
            </div>
        </div>

        <div className="relative shrink-0">
          <button 
              onClick={() => setShowMenu(!showMenu)} 
              className="p-2.5 rounded-xl text-white/15 hover:text-white/50 hover:bg-white/5 transition-all"
          >
              <MoreVertical className="w-5 h-5" />
          </button>

          <AnimatePresence>
              {showMenu && (
                  <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-36 bg-[#141414] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                          <button 
                              onClick={() => { onEdit(note); setShowMenu(false); }}
                              className="w-full px-3.5 py-2.5 text-left text-[11px] font-semibold text-white/50 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
                          >
                              <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button 
                              onClick={() => { onDeleteClick(note); setShowMenu(false); }}
                              className="w-full px-3.5 py-2.5 text-left text-[11px] font-semibold text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-400 transition-all flex items-center gap-2"
                          >
                              <Trash2 className="w-3 h-3" /> Delete
                          </button>
                      </motion.div>
                  </>
              )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const BellNotes = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [oosProducts, setOosProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    description: ''
  });
  const [activeTab, setActiveTab] = useState<'note' | 'oos'>('note');

  // Fetch notes from Firestore (real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notes'),
      where('vendorId', '==', user.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Note[];
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotes(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Notes snapshot failed:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch OOS products directly from Firestore (real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'products'),
      where('vendorId', '==', user.id),
      where('inStock', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
      setOosProducts(fetched);
    }, (err) => {
      console.error("OOS products snapshot failed:", err);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    return notes.filter(n => n.itemName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [notes, searchQuery]);

  const filteredOos = useMemo(() => {
    if (!searchQuery.trim()) return oosProducts;
    return oosProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [oosProducts, searchQuery]);

  const handleSaveNote = async () => {
    if (!formData.itemName.trim() || !formData.quantity.trim() || !user) {
        toast.error("Please fill all fields");
        return;
    }

    if (editingNote) {
        const toastId = toast.loading("Saving...");
        try {
            await updateDoc(doc(db, 'notes', editingNote.id), {
                itemName: formData.itemName.trim(),
                quantity: formData.quantity.trim(),
                description: formData.description.trim()
            });
            setEditingNote(null);
            setFormData({ itemName: '', quantity: '', description: '' });
            setShowAddModal(false);
            toast.success("Updated", { id: toastId });
        } catch (err) {
            toast.error("Failed to update", { id: toastId });
        }
    } else {
        const toastId = toast.loading("Saving...");
        try {
            await addDoc(collection(db, 'notes'), {
                vendorId: user.id,
                itemName: formData.itemName.trim(),
                quantity: formData.quantity.trim(),
                description: formData.description.trim(),
                type: 'note',
                createdAt: new Date().toISOString()
            });
            setFormData({ itemName: '', quantity: '', description: '' });
            setShowAddModal(false);
            toast.success("Added", { id: toastId });
        } catch (err) {
            toast.error("Failed to save", { id: toastId });
        }
    }
  };

  const confirmDelete = async () => {
    if (!deletingNote) return;
    const toastId = toast.loading("Removing...");
    try {
      await deleteDoc(doc(db, 'notes', deletingNote.id));
      setDeletingNote(null);
      toast.success("Removed", { id: toastId });
    } catch (err) {
      toast.error("Failed to delete", { id: toastId });
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({ 
        itemName: note.itemName, 
        quantity: String(note.quantity), 
        description: note.description || ''
    });
    setShowAddModal(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#202020] text-white">
      <Header />
      
      <div className="pt-24 pb-44 px-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/vendor')} className="flex items-center gap-1.5 text-[10px] text-white/20 hover:text-primary transition-colors font-bold uppercase tracking-widest mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!isSearching ? (
                  <motion.div key="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h1 className="text-2xl font-black text-white tracking-tight">Bell Notes</h1>
                      <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.15em] mt-0.5">Reminders & inventory</p>
                  </motion.div>
              ) : (
                  <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 mr-3">
                      <input 
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search..."
                          className="w-full bg-[#151515] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/15 outline-none focus:border-primary/30 transition-all font-medium"
                          autoFocus
                      />
                  </motion.div>
              )}
            </AnimatePresence>

            <button 
                onClick={() => { if (isSearching) { setIsSearching(false); setSearchQuery(''); } else setIsSearching(true); }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    isSearching ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/[0.03] text-white/20 border border-white/[0.06] hover:text-white/50'
                }`}
            >
                {isSearching ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
            <button
                onClick={() => setActiveTab('note')}
                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 ${
                    activeTab === 'note' 
                        ? 'bg-primary text-black shadow-lg shadow-primary/20' 
                        : 'bg-white/[0.03] text-white/25 border border-white/[0.04] hover:bg-white/[0.06]'
                }`}
            >
                <StickyNote className="w-4 h-4" /> Notes
            </button>
            <button
                onClick={() => setActiveTab('oos')}
                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 relative ${
                    activeTab === 'oos' 
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                        : 'bg-white/[0.03] text-white/25 border border-white/[0.04] hover:bg-white/[0.06]'
                }`}
            >
                <PackageX className="w-4 h-4" /> Out of Stock
                {oosProducts.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                        activeTab === 'oos' ? 'bg-white/20' : 'bg-rose-500/20 text-rose-400'
                    }`}>{oosProducts.length}</span>
                )}
            </button>
        </div>

        {/* Notes Tab */}
        {activeTab === 'note' && (
          <div className="space-y-2">
            {filteredNotes.length === 0 ? (
              <div className="py-16 text-center px-6">
                  <div className="w-12 h-12 bg-white/[0.03] rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/[0.04]">
                      {searchQuery ? <Search className="w-5 h-5 text-white/15" /> : <StickyNote className="w-5 h-5 text-white/15" />}
                  </div>
                  <p className="text-white/30 text-sm font-medium">{searchQuery ? 'No matches' : 'No notes yet'}</p>
                  <p className="text-white/15 text-xs mt-1">{searchQuery ? `Nothing for "${searchQuery}"` : 'Tap + to add your first note'}</p>
              </div>
            ) : (
              filteredNotes.map((note, i) => (
                <NoteCard key={note.id} note={note} onEdit={startEdit} onDeleteClick={setDeletingNote} index={i} />
              ))
            )}
          </div>
        )}

        {/* Out of Stock Tab */}
        {activeTab === 'oos' && (
          <div className="space-y-2">
            {filteredOos.length === 0 ? (
              <div className="py-16 text-center px-6">
                  <div className="w-12 h-12 bg-emerald-500/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/10">
                      <PackageX className="w-5 h-5 text-emerald-400/30" />
                  </div>
                  <p className="text-white/30 text-sm font-medium">{searchQuery ? 'No matches' : 'All in stock'}</p>
                  <p className="text-white/15 text-xs mt-1">{searchQuery ? `No OOS products match "${searchQuery}"` : 'All your products are available'}</p>
              </div>
            ) : (
              filteredOos.map((product, i) => (
                <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <div className="bg-[#1A1A1A] rounded-3xl p-5 border border-rose-500/10 hover:border-rose-500/20 transition-all flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-rose-500/5 shrink-0 flex items-center justify-center border border-rose-500/10">
                        {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <PackageX className="w-6 h-6 text-rose-500/30" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-base truncate">{product.name}</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-rose-400/80 font-bold text-xs bg-rose-500/10 px-2.5 py-1 rounded-lg">₹{product.price}</span>
                            {product.category && (
                                <span className="text-white/15 text-[10px] font-medium">{product.category}</span>
                            )}
                        </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/10">
                      <span className="text-rose-400 text-[9px] font-black uppercase tracking-wider">OOS</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* FAB - Notes tab only */}
        {activeTab === 'note' && (
          <div className="fixed bottom-28 right-6 z-50">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setEditingNote(null); setFormData({itemName: '', quantity: '', description: ''}); setShowAddModal(true); }}
              className="w-14 h-14 rounded-2xl bg-primary text-black flex items-center justify-center shadow-xl shadow-primary/25"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </motion.button>
          </div>
        )}

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                onClick={e => e.stopPropagation()}
                className="bg-[#1A1A1A] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-white/[0.06] shadow-2xl"
              >
                {/* Handle bar for mobile */}
                <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-6 sm:hidden" />

                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">{editingNote ? 'Edit Note' : 'New Note'}</h2>
                  <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/30 hover:text-white transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1.5 block">Item name</label>
                        <input
                            type="text"
                            value={formData.itemName}
                            onChange={e => setFormData(f => ({ ...f, itemName: e.target.value }))}
                            placeholder="e.g. Fresh Tomatoes"
                            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/15 outline-none focus:border-primary/30 transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1.5 block">Quantity</label>
                        <input
                            type="text"
                            value={formData.quantity}
                            onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))}
                            placeholder="e.g. 5 kg"
                            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/15 outline-none focus:border-primary/30 transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1.5 block">Description <span className="text-white/10">(optional)</span></label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                            placeholder="Any extra details..."
                            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/15 outline-none focus:border-primary/30 transition-all h-20 resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSaveNote}
                        className="w-full py-3.5 rounded-xl bg-primary text-black font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all mt-2"
                    >
                        {editingNote ? 'Save' : 'Add Note'}
                    </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirm */}
        <AnimatePresence>
            {deletingNote && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={() => setDeletingNote(null)}
                >
                    <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-[#1A1A1A] w-full max-w-sm rounded-2xl p-6 border border-white/[0.06] shadow-2xl text-center"
                    >
                        <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-6 h-6 text-rose-500" />
                        </div>
                        <h2 className="text-lg font-bold text-white mb-1">Delete note?</h2>
                        <p className="text-white/25 text-sm mb-6">"{deletingNote.itemName}" will be removed.</p>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingNote(null)}
                                className="flex-1 py-3 rounded-xl bg-white/[0.04] text-white/40 font-bold text-xs hover:bg-white/[0.08] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BellNotes;
