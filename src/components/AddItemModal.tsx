import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, category: string, note?: string) => void;
  onAddCategory: (category: string) => void;
  categories: string[];
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onAddCategory,
  categories,
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] || "Travel Essentials");
  const [note, setNote] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title, category, note);
    setTitle("");
    setNote("");
    onClose();
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim());
    setCategory(newCatName.trim());
    setNewCatName("");
    setIsAddingCategory(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="add-item-modal">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl p-5 z-50 shadow-xl"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold">ADD PACKING ITEM</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Item name *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Swimming Goggles"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Category</label>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="e.g. Photography Gear"
                      className="flex-1 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                    <button type="button" onClick={() => setIsAddingCategory(false)} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleCreateCategory} className="px-3 py-2 bg-indigo-600 text-white rounded-lg">Create</button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "ADD_NEW_CATEGORY") {
                        setIsAddingCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="ADD_NEW_CATEGORY" className="text-indigo-600 font-bold">+ Add New Category</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Optional note</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  Add Item
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
