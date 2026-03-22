import { FileText, CheckCircle2, X, PlusCircle } from 'lucide-react'
import { useRef, ChangeEvent } from 'react'
import { useHandStore } from '../../store/handStore'

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const FileStatus = () => {
  const { rawFiles, addRawFiles, clearRawFiles } = useHandStore()
  const addInputRef = useRef<HTMLInputElement>(null)
  const addFolderRef = useRef<HTMLInputElement>(null)

  if (rawFiles.length === 0) return null

  const totalSize = rawFiles.reduce((sum, f) => sum + f.size, 0)

  const onAddFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const txt = Array.from(e.target.files).filter((f) => f.name.endsWith('.txt'))
    if (txt.length > 0) addRawFiles(txt)
    e.target.value = ''
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-xs font-medium">
            <CheckCircle2 size={12} strokeWidth={2} />
            {rawFiles.length} file{rawFiles.length !== 1 ? 's' : ''} loaded
          </div>
          <span className="text-xs text-[var(--text-muted)]">{formatSize(totalSize)} total</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Add more */}
          <button
            onClick={() => addInputRef.current?.click()}
            title="Add more files"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
          >
            <PlusCircle size={13} strokeWidth={2} />
            Add more
          </button>
          {/* Clear all */}
          <button
            onClick={clearRawFiles}
            title="Clear all files"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-red)] transition-colors"
          >
            <X size={13} strokeWidth={2} />
            Clear all
          </button>
        </div>
      </div>

      {/* File list */}
      <ul className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto scrollbar-thin">
        {rawFiles.map((file) => (
          <li key={file.name} className="flex items-center gap-3 px-4 py-2.5">
            <FileText size={14} strokeWidth={1.75} className="shrink-0 text-[var(--text-muted)]" />
            <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{file.name}</span>
            <span className="shrink-0 text-xs text-[var(--text-muted)]">{formatSize(file.size)}</span>
            <button
              onClick={() =>
                useHandStore.getState().setRawFiles(rawFiles.filter((f) => f.name !== file.name))
              }
              aria-label={`Remove ${file.name}`}
              className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>

      {/* Hidden inputs */}
      <input ref={addInputRef} type="file" accept=".txt" multiple className="hidden" onChange={onAddFiles} />
      <input
        ref={addFolderRef}
        type="file"
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        onChange={onAddFiles}
      />
    </div>
  )
}
