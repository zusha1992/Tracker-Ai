import { useHandStore } from '../store/handStore'
import { FileUpload } from '../features/upload/FileUpload'
import { FileStatus } from '../features/upload/FileStatus'

export const Dashboard = () => {
  const rawFiles = useHandStore((s) => s.rawFiles)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Import Hand History</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Upload one or more hand history files, or select an entire folder.
        </p>
      </div>

      {rawFiles.length > 0 && <FileStatus />}
      <FileUpload />
    </div>
  )
}
