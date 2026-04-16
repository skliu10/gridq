import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { ComponentType } from 'react'

export function renderPopupContent<P extends object>(
  Component: ComponentType<P>,
  props: P
): HTMLElement {
  const container = document.createElement('div')
  const root = createRoot(container)
  flushSync(() => {
    root.render(createElement(Component, props))
  })
  return container
}
