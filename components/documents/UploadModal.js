// UploadModal — shows real-time step-by-step progress for each uploading file
// Steps: Upload → DB saved → Cloudinary stored → Pinecone indexed

'use client'

const STEPS = [
  { label: 'Uploading file' },
  { label: 'Saved metadata to database' },
  { label: 'Stored file in Cloudinary' },
  { label: 'Indexed vectors in Pinecone' },
]

// Returns 'done' | 'active' | 'error' | 'pending' for each step given the item state
function getStepStatus(stepIndex, stage, progress) {
  if (stage === 'error') {
    // Show first 2 steps as done (they completed before processing failed)
    if (stepIndex <= 1) return 'done'
    if (stepIndex === 2) return 'done'
    return 'error'
  }
  switch (stepIndex) {
    case 0: // Uploading
      if (stage !== 'uploading') return 'done'
      return progress >= 100 ? 'done' : 'active'
    case 1: // DB saved — happens immediately when upload response arrives
    case 2: // Cloudinary — happens in same request as DB
      if (stage === 'processing' || stage === 'done') return 'done'
      return 'pending'
    case 3: // Pinecone — background job, done when status = READY
      if (stage === 'done') return 'done'
      if (stage === 'processing') return 'active'
      return 'pending'
    default:
      return 'pending'
  }
}

function StepIcon({ status }) {
  if (status === 'done') {
    return (
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    )
  }
  if (status === 'active') {
    return (
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid #a1a1aa', borderTopColor: '#f4f4f5',
        flexShrink: 0, animation: 'spin 0.8s linear infinite',
      }} />
    )
  }
  if (status === 'error') {
    return (
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✕</span>
      </div>
    )
  }
  // pending
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      border: '2px solid #3f3f46', flexShrink: 0,
    }} />
  )
}

function FileProgress({ item }) {
  const { stage, progress, name } = item
  const allDone = stage === 'done'
  const hasFailed = stage === 'error'

  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '0.5px solid #27272a',
    }}>
      {/* Filename + overall status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{
          fontSize: 13, fontWeight: 500, color: '#f4f4f5',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%',
        }}>
          {name}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 500,
          color: allDone ? '#22c55e' : hasFailed ? '#ef4444' : '#a1a1aa',
          flexShrink: 0,
        }}>
          {allDone ? 'Ready' : hasFailed ? 'Failed' : stage === 'uploading' ? `${progress}%` : 'Processing...'}
        </span>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map((step, i) => {
          const status = getStepStatus(i, stage, progress)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StepIcon status={status} />
              <span style={{
                fontSize: 12,
                color: status === 'done' ? '#a1a1aa'
                  : status === 'active' ? '#f4f4f5'
                  : status === 'error' ? '#ef4444'
                  : '#52525b',
              }}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function UploadModal({ uploadItems }) {
  if (!uploadItems || uploadItems.length === 0) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)',
    }}>
      <div style={{
        background: '#18181b',
        border: '0.5px solid #27272a',
        borderRadius: 12,
        width: '100%',
        maxWidth: 420,
        margin: '0 16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '0.5px solid #27272a',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#f4f4f5', animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f5' }}>
            Processing {uploadItems.length === 1 ? 'document' : `${uploadItems.length} documents`}
          </span>
        </div>

        {/* Per-file progress */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {uploadItems.map(item => (
            <FileProgress key={item.id} item={item} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          borderTop: '0.5px solid #27272a',
          background: '#18181b',
        }}>
          <p style={{ fontSize: 11, color: '#52525b', textAlign: 'center' }}>
            Please wait while your documents are being processed
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
