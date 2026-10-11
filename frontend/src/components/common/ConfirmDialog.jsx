/**
 * Confirmation modal for destructive/irreversible actions (cancel bill,
 * deactivate staff, refund payment). Built on top of Modal.
 */

import Modal from "./Modal";

export default function ConfirmDialog({
  open, onClose, onConfirm, title = "Are you sure?", message,
  confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger", loading = false,
}) {
  const confirmClass =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700"
      : "bg-[#0B1E4A] hover:bg-[#132a63]";

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-sm">
      {message && <p className="text-sm text-slate-500 mb-5">{message}</p>}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 text-sm font-semibold text-slate-600 bg-slate-100 py-2.5 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 text-sm font-semibold text-white py-2.5 rounded-lg disabled:opacity-50 transition-colors ${confirmClass}`}
        >
          {loading ? "Please wait…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}