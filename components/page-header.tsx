import type React from "react"

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-black dark:text-white">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}
