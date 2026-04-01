// UploadZone — drag-and-drop file upload area, dark theme

'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { ACCEPTED_MIME_TYPES } from '../../lib/utils/constants'
import { validateFile } from '../../lib/utils/fileValidation'
import { showError } from '../ui/Toast'

export default function UploadZone({ onUpload, isUploading }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return

      const validation = validateFile({
        size: file.size,
        mimetype: file.type,
        originalFilename: file.name,
      })

      if (!validation.valid) {
        showError(validation.error)
        return
      }

      onUpload(file)
    },
    [onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {}),
    multiple: false,
    disabled: isUploading,
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors
        ${isDragActive
          ? 'border-zinc-500 bg-zinc-800'
          : 'border-zinc-700 bg-[#18181b] hover:border-zinc-600 hover:bg-zinc-800'}
        ${isUploading ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <p className="text-sm text-zinc-500">Uploading...</p>
      ) : isDragActive ? (
        <p className="text-sm text-zinc-300">Drop your file here</p>
      ) : (
        <div>
          <p className="text-sm text-zinc-300 font-medium">
            Drag &amp; drop PDF or DOCX
          </p>
          <p className="text-xs text-zinc-600 mt-1">or click to browse · max 10MB</p>
        </div>
      )}
    </div>
  )
}
