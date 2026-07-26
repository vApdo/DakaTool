"use client"

import { useRef, useState } from "react"
import { Upload, Film, Loader2 } from "lucide-react"
import { uploadVideo, startTranscription } from "@/lib/auto-subtitle/client"

const LANGUAGES: Array<{ value: string; label: string }> = [
  { value: "auto", label: "Tự động nhận diện" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
]

const ACCEPT = ".mp4,.mov,.webm,.mkv,video/mp4,video/quicktime,video/webm,video/x-matroska"

export function VideoUpload({ onStarted }: { onStarted: (projectId: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState("auto")
  const [separateVocals, setSeparateVocals] = useState(false)
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    if (!file || busy) return
    setError(null)
    setBusy(true)
    setUploadPct(0)
    try {
      const project = await uploadVideo(file, { language, separateVocals }, (f) =>
        setUploadPct(Math.round(f * 100)),
      )
      setUploadPct(100)
      await startTranscription(project.id)
      onStarted(project.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải lên thất bại.")
      setBusy(false)
      setUploadPct(null)
    }
  }

  return (
    <div className="space-y-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const dropped = e.dataTransfer.files?.[0]
          if (dropped) setFile(dropped)
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center transition hover:border-primary hover:bg-[color:var(--primary-soft)] dark:border-gray-700 dark:bg-gray-900/40"
      >
        {file ? (
          <>
            <Film className="h-9 w-9 text-primary" />
            <p className="font-medium text-black dark:text-white">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </>
        ) : (
          <>
            <Upload className="h-9 w-9 text-gray-400" />
            <p className="font-medium text-black dark:text-white">Kéo thả hoặc bấm để chọn video</p>
            <p className="text-xs text-gray-500">Hỗ trợ .mp4, .mov, .webm, .mkv — tối đa 1GB / 2 giờ</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ngôn ngữ giọng nói</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
        <input
          type="checkbox"
          checked={separateVocals}
          onChange={(e) => setSeparateVocals(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Video có nhạc nền to / bài hát</span>
          <span className="block text-xs text-gray-500">
            Tách giọng nói khỏi nhạc (Demucs) trước khi nhận dạng — chính xác hơn nhiều với
            video nhạc, đổi lại xử lý chậm hơn. Lần đầu dùng sẽ tải model ~300MB.
          </span>
        </span>
      </label>

      {uploadPct !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div className="h-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!file || busy}
        className="btn-primary w-full justify-center disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý…
          </>
        ) : (
          "Tạo phụ đề"
        )}
      </button>
    </div>
  )
}
