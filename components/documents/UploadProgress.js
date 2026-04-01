// UploadProgress — upload and processing progress bar, dark theme

export default function UploadProgress({ filename, uploadProgress, stage }) {
  const stageLabel = {
    uploading:  `Uploading... ${uploadProgress}%`,
    processing: 'Processing document...',
    done:       'Ready',
    error:      'Failed',
  }

  const progressBarColor = {
    uploading:  'bg-white',
    processing: 'bg-yellow-400',
    done:       'bg-green-400',
    error:      'bg-red-500',
  }

  const progressPercent =
    stage === 'uploading' ? uploadProgress : 100

  return (
    <div className="p-3 border border-zinc-700 rounded-lg bg-zinc-800">
      <p className="text-xs font-medium text-zinc-300 truncate mb-2">{filename}</p>

      <div className="w-full bg-zinc-700 rounded-full h-1 mb-1">
        <div
          className={`h-1 rounded-full transition-all duration-300 ${progressBarColor[stage] || 'bg-white'}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-xs text-zinc-500">{stageLabel[stage] || stage}</p>
    </div>
  )
}
