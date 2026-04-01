// DeleteConfirmModal — delete confirmation dialog, dark theme

'use client'

import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
  isDeleting,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Document">
      <p className="text-sm text-zinc-400 mb-6">
        Are you sure you want to delete{' '}
        <span className="font-semibold text-zinc-200">{documentName}</span>?{' '}
        This cannot be undone.
      </p>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={isDeleting} disabled={isDeleting}>
          Delete
        </Button>
      </div>
    </Modal>
  )
}
