import type { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <main className={`max-w-[860px] mx-auto px-4 py-8 ${className}`}>
      {children}
    </main>
  )
}
