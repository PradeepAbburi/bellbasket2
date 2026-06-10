import React, { useState, useEffect } from 'react';
import { 
    StickyNote, Search, Plus, Trash2, Edit2, 
    Calendar, Clock, AlertCircle, FileText,
    CheckCircle2, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, query, where } from 'firebase/firestore';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import PageLoading from '@/components/PageLoading';

const AdminNotes = () => {
    const { user } = useApp();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [newNoteTitle, setNewNoteTitle] = useState("");
    const [newNoteContent, setNewNoteContent] = useState("");
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<any | null>(null);

    useEffect(() => {
        if (!user?.id) return;
        const q = query(
            collection(db, "notes"), 
            where("vendorId", "==", user.id)
        );
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            setNotes(list);
            setLoading(false);
        }, (err) => {
            console.error("Notes snapshot failure:", err);
            setLoading(false);
        });
        return () => unsub();
    }, [user?.id]);

    if (loading) return <PageLoading />;

    const filteredNotes = notes.filter(n => {
        const matchesSearch = (n.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (n.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const handleSaveNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoteTitle.trim() || !user) {
            toast.error("Please enter a note title");
            return;
        }
        setIsSavingNote(true);
        try {
            const noteData = {
                vendorId: user.id,
                itemName: newNoteTitle.trim(),
                description: newNoteContent.trim(),
                quantity: "Admin Note",
                type: 'admin_note',
                createdAt: new Date().toISOString()
            };

            if (editingNoteId) {
                await updateDoc(doc(db, "notes", editingNoteId), {
                    itemName: newNoteTitle.trim(),
                    description: newNoteContent.trim(),
                    updatedAt: new Date().toISOString()
                });
                toast.success("Note updated successfully");
            } else {
                await addDoc(collection(db, "notes"), noteData);
                toast.success("Note saved successfully");
            }

            setNewNoteTitle("");
            setNewNoteContent("");
            setEditingNoteId(null);
            setShowAddModal(false);
        } catch (e: any) {
            console.error("Save note failed:", e);
            toast.error("Failed to save note");
        } finally {
            setIsSavingNote(false);
        }
    };

    const confirmDeleteNote = async () => {
        if (!noteToDelete) return;
        const toastId = toast.loading("Deleting note...");
        try {
            await deleteDoc(doc(db, "notes", noteToDelete.id));
            toast.success("Note deleted successfully", { id: toastId });
            setNoteToDelete(null);
        } catch (e) {
            console.error("Delete note failed:", e);
            toast.error("Failed to delete note", { id: toastId });
        }
    };

    const handleStartEdit = (note: any) => {
        setEditingNoteId(note.id);
        setNewNoteTitle(note.itemName);
        setNewNoteContent(note.description || "");
        setShowAddModal(true);
    };

    return (
        <div className="space-y-6 text-left flex flex-col h-[calc(100vh-10rem)]">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white tracking-tight">Admin Notes</h2>
                    <p className="text-slate-400 font-medium text-sm">Create and organize system reminders, checklists, and general administrative logs.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingNoteId(null);
                        setNewNoteTitle("");
                        setNewNoteContent("");
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-950/30 w-fit shrink-0"
                >
                    <Plus className="w-4.5 h-4.5" /> Create Note
                </button>
            </header>

            <div className="relative shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Query notes by title or content..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-black focus:ring-4 focus:ring-indigo-550/10 focus:border-indigo-500/50 transition-all outline-none text-white shadow-lg placeholder-slate-500"
                />
            </div>

            <div className="flex-1 overflow-y-auto pr-1 pb-20 custom-scrollbar">
                {filteredNotes.length === 0 ? (
                    <div className="p-10 text-center bg-[#0f172a] rounded-3xl border-dashed border-2 border-slate-800 mt-6">
                        <StickyNote className="w-10 h-10 text-slate-700 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            {searchQuery ? "No matching notes found" : "No notes saved yet"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-2">
                        {filteredNotes.map((note) => (
                            <div key={note.id} className="p-6 rounded-[2rem] bg-[#0f172a] border border-slate-800 shadow-lg flex flex-col justify-between gap-4 group hover:shadow-xl hover:shadow-indigo-500/5 transition-all relative min-h-[160px]">
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <h4 className="text-base font-black text-white leading-snug break-words flex-1">{note.itemName}</h4>
                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                            <button 
                                                onClick={() => handleStartEdit(note)}
                                                className="p-2 rounded-xl bg-indigo-950/40 text-indigo-400 hover:bg-indigo-900/60 border border-indigo-900/50 transition-all"
                                                title="Edit Note"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => setNoteToDelete(note)}
                                                className="p-2 rounded-xl bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-900/50 transition-all"
                                                title="Delete Note"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {note.description && (
                                        <p className="text-slate-400 text-sm leading-relaxed font-medium whitespace-pre-wrap break-words">{note.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-auto pt-2 border-t border-slate-800/60">
                                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                                    {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(note.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-[#0f172a] w-full max-w-md rounded-[2.5rem] border border-slate-800 shadow-2xl p-6 md:p-8 text-left relative"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                    <StickyNote className="w-5 h-5 text-indigo-400" />
                                    {editingNoteId ? "Edit Note" : "Create Note"}
                                </h3>
                                <button 
                                    onClick={() => setShowAddModal(false)} 
                                    className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                                >
                                    <Plus className="w-5 h-5 rotate-45" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveNote} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Title</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Check payouts spreadsheet"
                                        value={newNoteTitle}
                                        onChange={(e) => setNewNoteTitle(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all outline-none mt-1 text-white placeholder-slate-600"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Content</label>
                                    <textarea 
                                        placeholder="Write note contents here..."
                                        value={newNoteContent}
                                        onChange={(e) => setNewNoteContent(e.target.value)}
                                        rows={6}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 px-4 text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all outline-none mt-1 resize-none text-white placeholder-slate-600"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSavingNote}
                                        className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md disabled:opacity-50"
                                    >
                                        {isSavingNote ? "Saving..." : (editingNoteId ? "Update Note" : "Save Note")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs uppercase hover:bg-slate-800 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {noteToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
                        onClick={() => setNoteToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0f172a] w-full max-w-sm rounded-[2.5rem] p-6 border border-slate-800 shadow-2xl text-center"
                        >
                            <div className="w-12 h-12 bg-rose-950/40 border border-rose-900/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-5 h-5 text-rose-400" />
                            </div>
                            <h2 className="text-lg font-black text-white mb-1">Delete Note?</h2>
                            <p className="text-slate-400 text-xs mb-6 font-medium">"{noteToDelete.itemName}" will be permanently deleted.</p>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setNoteToDelete(null)}
                                    className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs uppercase hover:bg-slate-800 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteNote}
                                    className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-xs uppercase shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminNotes;
