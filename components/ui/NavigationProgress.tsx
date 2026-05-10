'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [completing, setCompleting] = useState(false)
  const rafRef = useRef<number>()
  const completeTimer = useRef<ReturnType<typeof setTimeout>>()
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()

  // Start the bar on any <a> click that looks like an internal navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return
      if (target.target === '_blank') return
      start()
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  // Complete the bar when the route actually changes
  useEffect(() => {
    complete()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  function start() {
    clearTimeout(completeTimer.current)
    clearTimeout(hideTimer.current)
    cancelAnimationFrame(rafRef.current!)
    setCompleting(false)
    setVisible(true)
  }

  function complete() {
    if (!visible) return
    cancelAnimationFrame(rafRef.current!)
    setCompleting(true)
    hideTimer.current = setTimeout(() => {
      setVisible(false)
      setCompleting(false)
    }, 400)
  }

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none relative overflow-hidden"
      style={{
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: completing ? '100%' : '30%',
          background: '#F5A3FF',
          boxShadow: '0 0 8px rgba(245, 163, 255, 0.6)',
          opacity: completing ? 0 : 1,
          position: 'absolute',
          left: completing ? 0 : '-30%',
          animation: completing ? 'none' : 'navprog 1.1s ease-in-out infinite',
          transition: completing ? 'width 0.2s ease-out, left 0.2s ease-out, opacity 0.15s ease 0.25s' : undefined,
        }}
      />
      <style jsx>{`
        @keyframes navprog {
          0% { left: -30%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}
