"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Download, RotateCcw } from "lucide-react"
import {
  HBL_FIELD_LABELS,
  HBL_FIELD_ORDER,
  type HblExtractionResult,
  type HblFieldKey,
} from "@/lib/pdf/types"
import { FieldNotFoundBadge } from "./extraction-status"

/** Các trường nhiều dòng dùng textarea. */
const MULTILINE_FIELDS: HblFieldKey[] = [
  "shipper",
  "consignee",
  "notifyParty",
  "marksAndNumbers",
  "descriptionOfGoods",
]

type FormValues = Record<HblFieldKey, string>

function toFormValues(result: HblExtractionResult): FormValues {
  return Object.fromEntries(
    HBL_FIELD_ORDER.map((key) => [key, result[key].value]),
  ) as FormValues
}

export function HblExtractionForm({
  result,
  fileName,
}: {
  result: HblExtractionResult
  fileName: string
}) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(result))
  const [copied, setCopied] = useState(false)

  // Kết quả mới (file khác) → nạp lại form.
  useEffect(() => {
    setValues(toFormValues(result))
  }, [result])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  function handleCopyAll() {
    const text = HBL_FIELD_ORDER.map((key) => `${HBL_FIELD_LABELS[key]}: ${values[key]}`).join("\n")
    void navigator.clipboard.writeText(text).then(() => setCopied(true))
  }

  function handleExportJson() {
    const payload = {
      fileName,
      exportedAt: new Date().toISOString(),
      fields: Object.fromEntries(
        HBL_FIELD_ORDER.map((key) => [
          key,
          { label: HBL_FIELD_LABELS[key], value: values[key], status: result[key].status, confidence: result[key].confidence },
        ]),
      ),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName.replace(/\.pdf$/i, "")}-hbl.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleCopyAll} className="btn-primary">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Đã sao chép" : "Sao chép toàn bộ"}
        </button>
        <button type="button" onClick={handleExportJson} className="btn-outline">
          <Download className="h-4 w-4" />
          Xuất JSON
        </button>
        <button type="button" onClick={() => setValues(toFormValues(result))} className="btn-outline">
          <RotateCcw className="h-4 w-4" />
          Đặt lại
        </button>
      </div>

      <div className="space-y-3">
        {HBL_FIELD_ORDER.map((key) => {
          const field = result[key]
          const missing = field.status === "not-found"
          const inputClass = `field-input ${missing ? "border-amber-500/60" : ""}`
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor={`hbl-${key}`} className="field-label mb-0">
                  {HBL_FIELD_LABELS[key]}
                </label>
                {missing && <FieldNotFoundBadge />}
              </div>
              {MULTILINE_FIELDS.includes(key) ? (
                <textarea
                  id={`hbl-${key}`}
                  rows={Math.min(5, Math.max(2, values[key].split("\n").length))}
                  value={values[key]}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
                />
              ) : (
                <input
                  id={`hbl-${key}`}
                  type="text"
                  value={values[key]}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  className={inputClass}
                />
              )}
              {field.sourceText && field.sourceText !== values[key] && (
                <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400" title={field.sourceText}>
                  Nguồn: {field.sourceText}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
