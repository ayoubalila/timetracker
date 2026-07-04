export type ToastType = 'error' | 'success' | 'info'

export interface ToastEvent {
  message: string
  type: ToastType
  id: number
}

let nextId = 0

export function toast(message: string, type: ToastType = 'error') {
  window.dispatchEvent(
    new CustomEvent<ToastEvent>('app:toast', {
      detail: { message, type, id: ++nextId },
    }),
  )
}
