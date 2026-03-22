import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { UploadCloud, FolderOpen, Files } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useHandStore } from '../../store/handStore'

// Recursively collect all .txt files from a FileSystemEntry (file or directory)
const collectTxtFromEntry = (entry: FileSystemEntry): Promise<File[]> => {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry
    return new Promise((resolve) => {
      fileEntry.file(
        (file) => resolve(file.name.endsWith('.txt') ? [file] : []),
        () => resolve([])
      )
    })
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry
    const reader = dirEntry.createReader()

    // readEntries only returns up to 100 items at a time — loop until empty
    const readAll = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve) => {
        const results: FileSystemEntry[] = []
        const readBatch = () => {
          reader.readEntries((batch) => {
            if (batch.length === 0) {
              resolve(results)
            } else {
              results.push(...batch)
              readBatch()
            }
          }, () => resolve(results))
        }
        readBatch()
      })

    return readAll().then((entries) =>
      Promise.all(entries.map(collectTxtFromEntry)).then((nested) =>
        nested.flat()
      )
    )
  }

  return Promise.resolve([])
}

const collectTxtFromDrop = async (dataTransfer: DataTransfer): Promise<File[]> => {
  const items = Array.from(dataTransfer.items)
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => !!e)

  const nested = await Promise.all(entries.map(collectTxtFromEntry))
  return nested.flat()
}

export const FileUpload = () => {
  const addRawFiles = useHandStore((s) => s.addRawFiles)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | File[]) => {
    const txt = Array.from(files).filter((f) => f.name.endsWith('.txt'))
    if (txt.length === 0) {
      alert('No .txt files found in the selection.')
      return
    }
    addRawFiles(txt)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
  }

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)

    const files = await collectTxtFromDrop(e.dataTransfer)
    if (files.length === 0) {
      alert('No .txt files found in the dropped items.')
      return
    }
    addRawFiles(files)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors select-none',
        dragging
          ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/5'
          : 'border-[var(--border)]'
      )}
    >
      <UploadCloud
        size={36}
        strokeWidth={1.5}
        className={cn(
          'transition-colors',
          dragging ? 'text-[var(--accent-green)]' : 'text-[var(--text-muted)]'
        )}
      />

      <div className="text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Drop files or a folder here
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Only <span className="font-medium">.txt</span> hand history files will be loaded
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
        >
          <Files size={13} strokeWidth={2} />
          Choose files
        </button>
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors"
        >
          <FolderOpen size={13} strokeWidth={2} />
          Choose folder
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        multiple
        className="hidden"
        onChange={onFileChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        // @ts-ignore — webkitdirectory is not in React types but works in all modern browsers
        webkitdirectory=""
        onChange={onFileChange}
      />
    </div>
  )
}
