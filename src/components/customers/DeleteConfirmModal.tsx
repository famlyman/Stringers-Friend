import React from "react";

interface DeleteConfirmModalProps {
  deleteConfirm: { type: 'customer' | 'racquet', id: string, name?: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ deleteConfirm, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!deleteConfirm) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-neutral-200 dark:border-neutral-800">
        <h3 className="text-xl font-bold text-primary mb-2">Confirm Delete</h3>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Are you sure you want to delete this {deleteConfirm.type}{deleteConfirm.name ? ` "${deleteConfirm.name}"` : ""}? 
          {deleteConfirm.type === 'customer' && " This will also delete all their racquets and jobs. This action cannot be undone."}
          {deleteConfirm.type === 'racquet' && " This action cannot be undone."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white py-2 rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 py-2 rounded-xl font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
