interface SettingsSectionProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  testId?: string
}

export function SettingsSection({ icon, title, description, children, testId }: SettingsSectionProps) {
  return (
    <section
      data-testid={testId}
      className="py-8 first:pt-0 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10"
    >
      <div className="mb-4 flex gap-3 lg:mb-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>

      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </section>
  )
}
