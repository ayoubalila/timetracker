import { AlertIcon, CheckIcon } from './icons'

interface AlertProps {
  variant: 'error' | 'success'
  message: string
  testId?: string
}

export function Alert({ variant, message, testId }: AlertProps) {
  const isError = variant === 'error'
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
        isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {isError ? (
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <p data-testid={testId}>{message}</p>
    </div>
  )
}
