"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { Download, Eye, FilePenLine, PencilLine, Plus, Printer, ReceiptText, Trash2 } from "lucide-react"
import type { Tool } from "@/lib/types"
import {
  calculateItemTotal,
  calculatePaymentTotal,
  COMPANY_PROFILES,
  DEFAULT_DEPARTMENTS,
  DEFAULT_REQUESTERS,
  formatVietnameseDate,
  formatVnd,
  numberToVietnameseWords,
  paymentRecipient,
  type PaymentRequestData,
  type PaymentRequestItem,
} from "@/lib/payment-request"
import { downloadBytes } from "@/lib/download"
import { RunStatusLine, errorMessage } from "./pdf/run-status"
import { useToolRunState } from "./pdf/use-tool-run-state"

function todayIso() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function newItem(): PaymentRequestItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    unit: "",
    quantity: 1,
    unitPrice: 0,
    note: "",
  }
}

function createInitialData(): PaymentRequestData {
  return {
    companyName: COMPANY_PROFILES[0].name,
    companyAddress: COMPANY_PROFILES[0].address,
    requestDate: "",
    recipient: paymentRecipient(COMPANY_PROFILES[0].name),
    requesterName: "",
    department: "",
    paymentContent: "",
    items: [
      {
        id: "payment-item-1",
        name: "",
        unit: "",
        quantity: 1,
        unitPrice: 0,
        note: "",
      },
    ],
  }
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  onBlur,
  error,
  required,
}: {
  id: string
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`field-input min-h-11 ${error ? "field-input-error" : ""}`}
      >
        <option value="">Chọn {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="field-input"
      />
    </div>
  )
}

function PaymentDocument({ data }: { data: PaymentRequestData }) {
  const total = calculatePaymentTotal(data.items)
  const itemCount = Math.max(1, data.items.length)
  const documentStyle = {
    "--payment-row-height": `${Math.min(5.55, 18.18 / itemCount)}em`,
  } as CSSProperties
  return (
    <article
      className="payment-document bg-white text-black"
      aria-label="Bản xem trước giấy đề nghị thanh toán"
      style={documentStyle}
    >
      <header className="payment-doc-header">
        <div>
          <p className="font-bold uppercase">{data.companyName || "Tên công ty"}</p>
          <p className="font-bold">{data.companyAddress || "Địa chỉ công ty"}</p>
        </div>
        <div className="text-center">
          <p className="font-bold">Mẫu số 05 - TT</p>
          <p className="italic">(Ban hành kèm theo thông tư số 133/2016/TT-BTC</p>
          <p className="italic">ngày 26/08/2016 của Bộ tài chính)</p>
        </div>
      </header>

      <div className="payment-doc-title">
        <h2>GIẤY ĐỀ NGHỊ THANH TOÁN</h2>
        <p>{formatVietnameseDate(data.requestDate)}</p>
      </div>

      <div className="payment-doc-meta">
        <p className="payment-recipient italic">
          <strong>Kính gửi:</strong> {data.recipient || "Đơn vị phê duyệt"}
        </p>
        <div className="grid grid-cols-2 gap-5">
          <p>
            Người đề nghị: <strong>{data.requesterName || "..."}</strong>
          </p>
          <p>
            Bộ phận: <strong>{data.department || "..."}</strong>
          </p>
        </div>
        <p>Nội dung thanh toán như sau: {data.paymentContent || ""}</p>
      </div>

      <table className="payment-doc-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>TÊN HÀNG HÓA</th>
            <th>ĐVT</th>
            <th>SỐ LƯỢNG</th>
            <th>ĐƠN GIÁ</th>
            <th>THÀNH TIỀN</th>
            <th>GHI CHÚ</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={item.id}>
              <td className="text-center">{index + 1}</td>
              <td>{item.name}</td>
              <td className="text-center">{item.unit}</td>
              <td className="text-right">{item.quantity ? formatVnd(item.quantity) : ""}</td>
              <td className="text-right">{item.unitPrice ? formatVnd(item.unitPrice) : ""}</td>
              <td className="text-right">{calculateItemTotal(item) ? formatVnd(calculateItemTotal(item)) : ""}</td>
              <td>{item.note}</td>
            </tr>
          ))}
          <tr className="payment-total-row">
            <td colSpan={5}>TỔNG</td>
            <td className="text-right">{formatVnd(total)}</td>
            <td />
          </tr>
        </tbody>
      </table>

      <p className="payment-words">
        <em>Bằng chữ:</em> <span>{numberToVietnameseWords(total)}./</span>
      </p>

      <footer className="payment-signatures">
        {["Phê duyệt", "Kế toán", "Trưởng bộ phận", "Người đề nghị"].map((label) => (
          <div key={label}>
            <strong>{label}</strong>
            <em>(Ký, họ tên)</em>
          </div>
        ))}
      </footer>
    </article>
  )
}

type FormErrors = {
  requesterName?: string
  department?: string
  items: Record<string, string>
}

function getFormErrors(data: PaymentRequestData): FormErrors {
  const itemErrors = Object.fromEntries(
    data.items.filter((item) => !item.name.trim()).map((item) => [item.id, "Nhập tên hàng hóa hoặc dịch vụ."]),
  )
  return {
    requesterName: data.requesterName.trim() ? undefined : "Chọn người đề nghị.",
    department: data.department.trim() ? undefined : "Chọn bộ phận.",
    items: itemErrors,
  }
}

function hasFormErrors(errors: FormErrors) {
  return Boolean(errors.requesterName || errors.department || Object.keys(errors.items).length)
}

export function PaymentRequestRunner({ tool }: { tool: Tool }) {
  const [data, setData] = useState<PaymentRequestData>(createInitialData)
  const [state, setState] = useToolRunState(tool)
  const [companyProfileId, setCompanyProfileId] = useState(COMPANY_PROFILES[0].id)
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [isCompanyCustomized, setIsCompanyCustomized] = useState(false)
  const [mobileView, setMobileView] = useState<"form" | "preview">("form")
  const [errors, setErrors] = useState<FormErrors>({ items: {} })
  const total = useMemo(() => calculatePaymentTotal(data.items), [data.items])
  const recipient = paymentRecipient(data.companyName)

  useEffect(() => {
    setData((current) => ({ ...current, requestDate: todayIso() }))
  }, [])

  function update<K extends keyof PaymentRequestData>(key: K, value: PaymentRequestData[K]) {
    setData((current) => ({ ...current, [key]: value }))
    if (state.step !== "idle") setState({ step: "idle" })
  }

  function updateItem(id: string, patch: Partial<PaymentRequestItem>) {
    update(
      "items",
      data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
    if (typeof patch.name === "string" && patch.name.trim()) {
      setErrors((current) => {
        const nextItems = { ...current.items }
        delete nextItems[id]
        return { ...current, items: nextItems }
      })
    }
  }

  function selectCompany(companyId: string) {
    const company = COMPANY_PROFILES.find((profile) => profile.id === companyId)
    if (!company) return
    setCompanyProfileId(companyId)
    setIsEditingCompany(false)
    setIsCompanyCustomized(false)
    setData((current) => ({
      ...current,
      companyName: company.name,
      companyAddress: company.address,
      recipient: paymentRecipient(company.name),
    }))
    if (state.step !== "idle") setState({ step: "idle" })
  }

  function documentData(): PaymentRequestData {
    return { ...data, recipient }
  }

  function validateAndFocus() {
    const nextErrors = getFormErrors(data)
    setErrors(nextErrors)
    if (!hasFormErrors(nextErrors)) return true

    setMobileView("form")
    const firstItemId = Object.keys(nextErrors.items)[0]
    const firstId = nextErrors.requesterName
      ? "pr-requester"
      : nextErrors.department
        ? "pr-department"
        : `${window.matchMedia("(min-width: 1280px)").matches ? "pr-item" : "pr-item-mobile"}-${firstItemId}`
    requestAnimationFrame(() => document.getElementById(firstId)?.focus())
    setState({ step: "error", message: "Kiểm tra các trường được đánh dấu và hoàn tất thông tin bắt buộc." })
    return false
  }

  async function createPdf() {
    const { generatePaymentRequestPdf } = await import("@/lib/pdf/payment-request")
    return generatePaymentRequestPdf(documentData())
  }

  async function handleDownload() {
    if (!validateAndFocus()) return
    setState({ step: "working", message: "Đang tạo giấy đề nghị thanh toán..." })
    try {
      const bytes = await createPdf()
      const fileName = `giay-de-nghi-thanh-toan-${data.requestDate || "moi"}.pdf`
      downloadBytes(fileName, bytes, "application/pdf")
      setState({ step: "done", message: `Đã tạo và tải xuống "${fileName}".` })
    } catch (error) {
      setState({ step: "error", message: errorMessage(error) })
    }
  }

  function handlePrint() {
    if (!validateAndFocus()) return
    setState({ step: "working", message: "Đang mở hộp thoại in..." })
    window.print()
    setState({ step: "done", message: "Đã mở hộp thoại in của trình duyệt." })
  }

  function validateRequester() {
    setErrors((current) => ({
      ...current,
      requesterName: data.requesterName.trim() ? undefined : "Chọn người đề nghị.",
    }))
  }

  function validateDepartment() {
    setErrors((current) => ({
      ...current,
      department: data.department.trim() ? undefined : "Chọn bộ phận.",
    }))
  }

  function validateItemName(item: PaymentRequestItem) {
    setErrors((current) => {
      const nextItems = { ...current.items }
      if (item.name.trim()) delete nextItems[item.id]
      else nextItems[item.id] = "Nhập tên hàng hóa hoặc dịch vụ."
      return { ...current, items: nextItems }
    })
  }

  function removeItem(id: string) {
    if (data.items.length === 1) return
    update("items", data.items.filter((item) => item.id !== id))
    setErrors((current) => {
      const nextItems = { ...current.items }
      delete nextItems[id]
      return { ...current, items: nextItems }
    })
  }

  return (
    <>
      <div className="payment-mobile-tabs" role="tablist" aria-label="Chế độ hiển thị">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "form"}
          aria-controls="payment-form-panel"
          onClick={() => setMobileView("form")}
        >
          <FilePenLine className="h-4 w-4" />
          Nhập liệu
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "preview"}
          aria-controls="payment-preview-panel"
          onClick={() => setMobileView("preview")}
        >
          <Eye className="h-4 w-4" />
          Xem trước
        </button>
      </div>

      <div className="payment-tool-grid">
        <div
          id="payment-form-panel"
          role="tabpanel"
          className={`payment-form-column ${mobileView === "form" ? "block" : "hidden"} xl:block`}
        >
          <section className="card payment-editor p-4 sm:p-5 md:p-6">
            <div className="mb-5 flex items-start gap-3 border-b border-[color:var(--card-border)] pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--primary-soft)] text-primary">
                <ReceiptText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-black dark:text-white">Thông tin chứng từ</h2>
                <p className="mt-1 max-w-prose text-sm text-gray-600 dark:text-gray-400">
                  Các thay đổi được phản ánh ngay trên bản xem trước A4.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-black dark:text-white">Công ty đề nghị</legend>
                <label htmlFor="pr-company-profile" className="field-label">Chọn công ty</label>
                <select
                  id="pr-company-profile"
                  value={companyProfileId}
                  onChange={(event) => selectCompany(event.target.value)}
                  className="field-input min-h-11"
                >
                  {COMPANY_PROFILES.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>

                <div className="mt-3 flex items-start justify-between gap-4 rounded-xl border border-[color:var(--card-border)] bg-black/[0.02] p-3 dark:bg-white/[0.025]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-black dark:text-white">{data.companyName}</p>
                      {isCompanyCustomized && (
                        <span className="rounded-full bg-[color:var(--primary-soft)] px-2 py-0.5 text-[11px] font-medium text-primary">Đã chỉnh sửa</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">{data.companyAddress}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingCompany((current) => !current)}
                    aria-expanded={isEditingCompany}
                    aria-controls="company-custom-fields"
                    className="btn-outline min-h-11 shrink-0 px-3"
                  >
                    <PencilLine className="h-4 w-4" />
                    {isEditingCompany ? "Đóng" : "Chỉnh sửa"}
                  </button>
                </div>

                {isEditingCompany && (
                  <div id="company-custom-fields" className="mt-3 grid gap-3 sm:grid-cols-2">
                    <TextField
                      id="pr-company"
                      label="Tên công ty trên chứng từ"
                      value={data.companyName}
                      onChange={(value) => {
                        setIsCompanyCustomized(true)
                        update("companyName", value)
                      }}
                    />
                    <TextField
                      id="pr-address"
                      label="Địa chỉ trên chứng từ"
                      value={data.companyAddress}
                      onChange={(value) => {
                        setIsCompanyCustomized(true)
                        update("companyAddress", value)
                      }}
                    />
                  </div>
                )}
              </fieldset>

              <div className="border-t border-[color:var(--card-border)]" />

              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-black dark:text-white">Người lập đề nghị</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    id="pr-requester"
                    label="Người đề nghị"
                    value={data.requesterName}
                    options={DEFAULT_REQUESTERS}
                    onChange={(value) => {
                      update("requesterName", value)
                      if (value) setErrors((current) => ({ ...current, requesterName: undefined }))
                    }}
                    onBlur={validateRequester}
                    error={errors.requesterName}
                    required
                  />
                  <SelectField
                    id="pr-department"
                    label="Bộ phận"
                    value={data.department}
                    options={DEFAULT_DEPARTMENTS}
                    onChange={(value) => {
                      update("department", value)
                      if (value) setErrors((current) => ({ ...current, department: undefined }))
                    }}
                    onBlur={validateDepartment}
                    error={errors.department}
                    required
                  />
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="payment-readonly-field">
                  <span>Kính gửi</span>
                  <strong>{recipient}</strong>
                </div>
                <div className="payment-readonly-field sm:min-w-48">
                  <span>Ngày đề nghị</span>
                  <strong aria-live="polite">
                    {data.requestDate ? formatVietnameseDate(data.requestDate) : "Đang cập nhật..."}
                  </strong>
                </div>
              </div>

              <div>
                <label htmlFor="pr-content" className="field-label">Nội dung thanh toán</label>
                <textarea
                  id="pr-content"
                  value={data.paymentContent}
                  onChange={(event) => update("paymentContent", event.target.value)}
                  placeholder="Ví dụ: Thanh toán chi phí thuê sân tháng 08/2026"
                  rows={2}
                  className="field-input min-h-20 resize-y"
                />
              </div>

              <div className="border-t border-[color:var(--card-border)]" />

              <section aria-labelledby="payment-items-title">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 id="payment-items-title" className="font-semibold text-black dark:text-white">Hàng hóa và chi phí</h3>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">Tối đa 8 dòng trên một trang A4.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => data.items.length < 8 && update("items", [...data.items, newItem()])}
                    disabled={data.items.length >= 8}
                    className="btn-outline min-h-11 shrink-0 px-3"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm dòng
                  </button>
                </div>

                <div className="payment-items-desktop">
                  <table>
                    <thead>
                      <tr>
                        <th>Tên hàng hóa *</th>
                        <th>ĐVT</th>
                        <th>SL</th>
                        <th>Đơn giá</th>
                        <th>Ghi chú</th>
                        <th>Thành tiền</th>
                        <th><span className="sr-only">Thao tác</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item, index) => (
                        <tr key={item.id}>
                          <td>
                            <input
                              id={`pr-item-${item.id}`}
                              aria-label={`Tên hàng hóa dòng ${index + 1}`}
                              aria-invalid={Boolean(errors.items[item.id])}
                              aria-describedby={errors.items[item.id] ? `pr-item-${item.id}-error` : undefined}
                              value={item.name}
                              onChange={(event) => updateItem(item.id, { name: event.target.value })}
                              onBlur={() => validateItemName(item)}
                              placeholder="Tên hàng hóa / dịch vụ"
                              className={`payment-cell-input ${errors.items[item.id] ? "field-input-error" : ""}`}
                            />
                            {errors.items[item.id] && (
                              <span id={`pr-item-${item.id}-error`} role="alert" className="payment-cell-error">{errors.items[item.id]}</span>
                            )}
                          </td>
                          <td><input aria-label={`Đơn vị tính dòng ${index + 1}`} value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} placeholder="cái" className="payment-cell-input" /></td>
                          <td><input aria-label={`Số lượng dòng ${index + 1}`} type="number" inputMode="decimal" min={0} step="any" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className="payment-cell-input payment-number-input" /></td>
                          <td><input aria-label={`Đơn giá dòng ${index + 1}`} type="number" inputMode="numeric" min={0} step={1000} value={item.unitPrice || ""} onChange={(event) => updateItem(item.id, { unitPrice: Number(event.target.value) })} placeholder="0" className="payment-cell-input payment-number-input" /></td>
                          <td><input aria-label={`Ghi chú dòng ${index + 1}`} value={item.note} onChange={(event) => updateItem(item.id, { note: event.target.value })} className="payment-cell-input" /></td>
                          <td className="payment-row-total">{formatVnd(calculateItemTotal(item))} ₫</td>
                          <td>
                            <button type="button" aria-label={`Xóa dòng ${index + 1}`} onClick={() => removeItem(item.id)} disabled={data.items.length === 1} className="payment-delete-button">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="payment-items-mobile">
                  {data.items.map((item, index) => (
                    <article key={item.id} className="payment-item-card">
                      <div className="mb-3 flex items-center justify-between">
                        <strong className="text-sm">Dòng {index + 1}</strong>
                        <button type="button" aria-label={`Xóa dòng ${index + 1}`} onClick={() => removeItem(item.id)} disabled={data.items.length === 1} className="payment-delete-button">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <label htmlFor={`pr-item-mobile-${item.id}`} className="field-label">Tên hàng hóa <span className="text-red-500">*</span></label>
                        <input
                          id={`pr-item-mobile-${item.id}`}
                          value={item.name}
                          onChange={(event) => updateItem(item.id, { name: event.target.value })}
                          onBlur={() => validateItemName(item)}
                          aria-invalid={Boolean(errors.items[item.id])}
                          aria-describedby={errors.items[item.id] ? `pr-item-mobile-${item.id}-error` : undefined}
                          placeholder="Tên hàng hóa / dịch vụ"
                          className={`field-input min-h-11 ${errors.items[item.id] ? "field-input-error" : ""}`}
                        />
                        {errors.items[item.id] && <p id={`pr-item-mobile-${item.id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{errors.items[item.id]}</p>}
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_0.8fr_1.35fr] gap-2">
                        <div><label htmlFor={`pr-unit-mobile-${item.id}`} className="field-label">ĐVT</label><input id={`pr-unit-mobile-${item.id}`} value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} placeholder="cái" className="field-input min-h-11 px-2" /></div>
                        <div><label htmlFor={`pr-quantity-mobile-${item.id}`} className="field-label">SL</label><input id={`pr-quantity-mobile-${item.id}`} type="number" inputMode="decimal" min={0} step="any" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} className="field-input min-h-11 px-2" /></div>
                        <div><label htmlFor={`pr-price-mobile-${item.id}`} className="field-label">Đơn giá</label><input id={`pr-price-mobile-${item.id}`} type="number" inputMode="numeric" min={0} step={1000} value={item.unitPrice || ""} onChange={(event) => updateItem(item.id, { unitPrice: Number(event.target.value) })} placeholder="0" className="field-input min-h-11 px-2" /></div>
                      </div>
                      <details className="payment-note-details">
                        <summary>Ghi chú <span>(tùy chọn)</span></summary>
                        <input aria-label={`Ghi chú dòng ${index + 1}`} value={item.note} onChange={(event) => updateItem(item.id, { note: event.target.value })} className="field-input mt-2 min-h-11" />
                      </details>
                      <p className="mt-3 text-right text-sm font-semibold">Thành tiền: <span className="text-primary">{formatVnd(calculateItemTotal(item))} ₫</span></p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>

          <div className="payment-action-bar" aria-label="Tổng tiền và thao tác xuất">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 xl:block">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Tổng đề nghị</span>
                <strong className="block text-lg tabular-nums text-primary">{formatVnd(total)} ₫</strong>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-400" title={numberToVietnameseWords(total)}>{numberToVietnameseWords(total)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={handleDownload} disabled={state.step === "working"} aria-busy={state.step === "working"} className="btn-primary min-h-11 px-4">
                <Download className="h-4 w-4" />
                Tải PDF
              </button>
              <button type="button" onClick={handlePrint} disabled={state.step === "working"} className="btn-outline min-h-11 px-4">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">In biểu mẫu</span><span className="sm:hidden">In</span>
              </button>
            </div>
            <div className="payment-run-status"><RunStatusLine state={state} /></div>
          </div>
        </div>

        <section
          id="payment-preview-panel"
          role="tabpanel"
          className={`payment-preview-shell ${mobileView === "preview" ? "block" : "hidden"} xl:block`}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Bản xem trước A4</p>
            <span className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--card)] px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400">Mẫu 05 - TT</span>
          </div>
          <div className="payment-preview-scroll">
            <PaymentDocument data={documentData()} />
          </div>
        </section>

        <style jsx global>{`
          .payment-mobile-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 16px; padding: 4px; border: 1px solid var(--card-border); border-radius: 12px; background: var(--card); }
          .payment-mobile-tabs button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 8px; border-radius: 9px; color: var(--muted-foreground); font-size: 14px; font-weight: 600; transition: background-color 180ms ease, color 180ms ease; }
          .payment-mobile-tabs button[aria-selected="true"] { background: var(--primary-soft); color: var(--primary); }
          .payment-mobile-tabs button:focus-visible, .payment-delete-button:focus-visible, .payment-note-details summary:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
          .payment-tool-grid { display: grid; gap: 20px; align-items: start; }
          .payment-form-column, .payment-preview-shell { min-width: 0; }
          .payment-editor fieldset { min-width: 0; }
          .payment-readonly-field { min-width: 0; border: 1px solid var(--card-border); border-radius: 10px; padding: 10px 12px; background: rgba(127,127,127,0.035); }
          .payment-readonly-field span { display: block; margin-bottom: 3px; color: var(--muted-foreground); font-size: 12px; font-weight: 500; }
          .payment-readonly-field strong { display: block; overflow-wrap: anywhere; color: var(--foreground); font-size: 13px; line-height: 1.45; }
          .field-input-error { border-color: #dc2626 !important; box-shadow: 0 0 0 3px rgba(220,38,38,0.1) !important; }
          .payment-items-desktop { display: none; overflow-x: auto; border: 1px solid var(--card-border); border-radius: 12px; }
          .payment-items-desktop table { width: 100%; min-width: 570px; table-layout: fixed; border-collapse: collapse; }
          .payment-items-desktop th { padding: 8px 6px; border-bottom: 1px solid var(--card-border); color: var(--muted-foreground); font-size: 11px; font-weight: 600; text-align: left; }
          .payment-items-desktop th:nth-child(1) { width: 25%; } .payment-items-desktop th:nth-child(2) { width: 9%; } .payment-items-desktop th:nth-child(3) { width: 8%; } .payment-items-desktop th:nth-child(4) { width: 14%; } .payment-items-desktop th:nth-child(5) { width: 16%; } .payment-items-desktop th:nth-child(6) { width: 18%; text-align: right; } .payment-items-desktop th:nth-child(7) { width: 44px; }
          .payment-items-desktop td { padding: 6px 4px; border-bottom: 1px solid var(--card-border); vertical-align: top; }
          .payment-items-desktop tbody tr:last-child td { border-bottom: 0; }
          .payment-cell-input { width: 100%; min-height: 38px; border: 1px solid transparent; border-radius: 7px; background: var(--background); padding: 7px 8px; color: var(--foreground); font-size: 12px; outline: none; transition: border-color 160ms ease, box-shadow 160ms ease; }
          .payment-cell-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
          .payment-number-input { text-align: right; font-variant-numeric: tabular-nums; }
          .payment-cell-error { display: block; margin: 4px 4px 0; color: #dc2626; font-size: 10px; font-weight: 600; }
          .dark .payment-cell-error { color: #f87171; }
          .payment-row-total { padding-top: 16px !important; color: var(--foreground); font-size: 12px; font-weight: 700; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
          .payment-delete-button { display: inline-flex; min-width: 44px; min-height: 44px; align-items: center; justify-content: center; border-radius: 8px; color: #9ca3af; transition: background-color 160ms ease, color 160ms ease; }
          .payment-delete-button:hover:not(:disabled) { background: rgba(220,38,38,0.1); color: #dc2626; }
          .payment-delete-button:disabled { cursor: not-allowed; opacity: 0.3; }
          .payment-items-mobile { display: grid; gap: 12px; }
          .payment-item-card { border: 1px solid var(--card-border); border-radius: 12px; padding: 12px; background: rgba(127,127,127,0.025); }
          .payment-note-details { margin-top: 10px; }
          .payment-note-details summary { min-height: 36px; cursor: pointer; color: var(--muted-foreground); font-size: 12px; font-weight: 600; line-height: 36px; }
          .payment-note-details summary span { font-weight: 400; }
          .payment-action-bar { position: fixed; z-index: 20; right: 12px; bottom: 12px; left: 12px; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px 12px; align-items: center; border: 1px solid var(--card-border); border-radius: 14px; background: var(--background); padding: 10px 12px; box-shadow: 0 14px 38px rgba(0,0,0,0.24); }
          .payment-run-status { grid-column: 1 / -1; }
          .payment-run-status:empty { display: none; }
          .payment-form-column { padding-bottom: 116px; }
          .payment-preview-scroll { container-type: inline-size; overflow: hidden; border-radius: 14px; background: #dfe2e6; padding: 10px; box-shadow: inset 0 0 0 1px rgba(15,23,42,0.06); }
          .payment-document { width: 100%; min-height: auto; aspect-ratio: 210 / 297; margin: 0 auto; padding: 4.76% 2.38% 4.76% 4.76%; background: white; font-family: "Times New Roman", Times, serif; font-size: 1.85cqw; line-height: 1.18; box-shadow: 0 10px 24px rgba(15,23,42,0.18); }
          .payment-doc-header { display: grid; grid-template-columns: 49.93% 50.07%; min-height: 6.5%; font-size: 0.91em; line-height: 1.2; }
          .payment-doc-title { margin: 1.75% 0 3.4%; text-align: center; }
          .payment-doc-title h2 { font-size: 1.45em; font-weight: 700; line-height: 1.05; }
          .payment-doc-title p { margin-top: 0.35em; font-size: 1em; }
          .payment-doc-meta { display: grid; gap: 0.18em; margin-bottom: 1.75%; line-height: 1.2; }
          .payment-recipient { padding-left: 6.5%; }
          .payment-doc-table { width: 99.37%; table-layout: fixed; border-collapse: collapse; font-size: 1em; line-height: 1.05; }
          .payment-doc-table th, .payment-doc-table td { border: 1px solid #111; padding: 0.35em 0.28em; vertical-align: middle; }
          .payment-doc-table th { height: 3em; font-weight: 700; text-align: center; }
          .payment-doc-table tbody tr:not(.payment-total-row) td { height: var(--payment-row-height); }
          .payment-doc-table th:nth-child(1) { width: 6.49%; } .payment-doc-table th:nth-child(2) { width: 28.35%; } .payment-doc-table th:nth-child(3) { width: 6.35%; } .payment-doc-table th:nth-child(4) { width: 8.74%; } .payment-doc-table th:nth-child(5) { width: 14.39%; } .payment-doc-table th:nth-child(6) { width: 13.4%; } .payment-doc-table th:nth-child(7) { width: 22.28%; }
          .payment-doc-table th:nth-child(6) { font-size: 0.9em; white-space: nowrap; }
          .payment-total-row td { height: 1.9em; font-weight: 700; } .payment-total-row td:first-child { text-align: center; }
          .payment-words { padding: 0.55em 6.5% 0; font-style: italic; } .payment-words span { margin-left: 0.45em; }
          .payment-signatures { display: grid; grid-template-columns: 28.35fr 15.09fr 20.74fr 29.33fr; margin-top: 1.1em; margin-left: 6.49%; text-align: center; } .payment-signatures div { display: grid; gap: 0.22em; }
          @media (min-width: 1280px) {
            .payment-mobile-tabs { display: none; }
            .payment-tool-grid { grid-template-columns: minmax(600px,1.08fr) minmax(340px,0.92fr); gap: 24px; }
            .payment-form-column { padding-bottom: 0; }
            .payment-items-desktop { display: block; }
            .payment-items-mobile { display: none; }
            .payment-action-bar { position: sticky; right: auto; bottom: 16px; left: auto; z-index: 10; margin-top: 14px; box-shadow: 0 10px 28px rgba(0,0,0,0.16); }
            .payment-preview-shell { position: sticky; top: 24px; }
            .payment-preview-scroll { padding: 16px; }
          }
          @media (min-width: 768px) and (max-width: 1279px) {
            .payment-action-bar { left: calc(15rem + 12px); }
          }
          @media (max-width: 520px) {
            .payment-action-bar { grid-template-columns: minmax(0,1fr); }
            .payment-action-bar > div:nth-child(2) { display: grid; grid-template-columns: 1fr 1fr; }
            .payment-action-bar .btn-primary, .payment-action-bar .btn-outline { min-width: 0; justify-content: center; padding-inline: 14px; white-space: nowrap; }
            .payment-form-column { padding-bottom: 164px; }
          }
          @media print {
            body * { visibility: hidden !important; }
            .payment-tool-grid, .payment-preview-shell, .payment-preview-scroll { display: block !important; overflow: visible !important; padding: 0 !important; background: transparent !important; }
            .payment-document, .payment-document * { visibility: visible !important; }
            .payment-document { position: absolute; inset: 0; width: 210mm; min-height: 297mm; aspect-ratio: auto; margin: 0; padding: 13mm 13mm 14mm; font-size: 13px; box-shadow: none; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .payment-doc-title h2 { font-size: 24px; }
            .payment-action-bar, .payment-mobile-tabs, .payment-form-column { display: none !important; }
            @page { size: A4 portrait; margin: 0; }
          }
        `}</style>
      </div>
    </>
  )
}
