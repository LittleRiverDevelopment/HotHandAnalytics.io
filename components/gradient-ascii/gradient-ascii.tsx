// Copyright (c) 2026 Bruno Delorence. MIT License.
// Background adaptation: React 18 (no useEffectEvent), no customize panel, and an
// optional full-bleed mode whose pointer follows the page without stealing clicks.

'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { DEFAULTS, type GradientSettings } from './presets'
import { createRenderer, type Renderer } from './renderer'
import styles from './gradient-ascii.module.css'

type Settable = Omit<GradientSettings, 'lightMode'> & { lightMode?: boolean }

export type GradientASCIIProps = Partial<Settable> & {
  className?: string
  /** Fill the parent edge to edge, with no frame or replay control. */
  background?: boolean
  colorScheme?: 'light' | 'dark' | 'system'
  /** Highest device pixel ratio to draw at. Never above 2. */
  dpr?: number
}

const SETTING_KEYS = Object.keys(DEFAULTS) as (keyof GradientSettings)[]

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setReduced(media.matches)
    read()
    media.addEventListener('change', read)
    return () => media.removeEventListener('change', read)
  }, [])
  return reduced
}

export default function GradientASCII({
  className,
  background = false,
  colorScheme = 'dark',
  dpr = 2,
  ...props
}: GradientASCIIProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const renderer = useRef<Renderer | null>(null)
  const [failed, setFailed] = useState(false)
  const reduced = useReducedMotion()

  const propKey = JSON.stringify(SETTING_KEYS.map(key => props[key]))
  const settings = useMemo(() => {
    const given: Partial<GradientSettings> = {}
    for (const key of SETTING_KEYS) {
      const value = props[key]
      if (value !== undefined) (given as Record<string, unknown>)[key] = value
    }
    return { ...DEFAULTS, lightMode: false, ...given } as GradientSettings
    // Props are read through propKey so a new object identity does not restart the shader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propKey])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    let made: Renderer | null = null
    try {
      made = createRenderer(element)
    } catch {
      made = null
    }
    if (!made) {
      setFailed(true)
      return
    }
    renderer.current = made
    let onScreen = false
    const update = () => made?.active((onScreen || background) && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      update()
    })
    observer.observe(element)
    if (background && element.getBoundingClientRect().height > 0) {
      onScreen = true
      update()
    }
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      made?.destroy()
      renderer.current = null
    }
  }, [background])

  useEffect(() => {
    renderer.current?.set(settings, reduced, dpr)
  }, [settings, reduced, dpr])

  useEffect(() => {
    if (!background || !settings.mouseInteraction) return
    const toLocal = (event: PointerEvent) => {
      const rect = stage.current?.getBoundingClientRect()
      if (!rect) return null
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const move = (event: PointerEvent) => {
      const point = toLocal(event)
      if (point) renderer.current?.pointer(point.x, point.y)
    }
    const down = (event: PointerEvent) => {
      const point = toLocal(event)
      if (point) renderer.current?.click(point.x, point.y)
    }
    const leave = () => renderer.current?.pointer(null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      document.documentElement.removeEventListener('pointerleave', leave)
      renderer.current?.pointer(null)
    }
  }, [background, settings.mouseInteraction])

  const local = (event: ReactPointerEvent) => {
    const rect = stage.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  return (
    <div
      className={`${styles.root} ${background ? styles.background : ''} ${className ?? ''}`}
      data-color-scheme={colorScheme}
    >
      <div className={styles.frame} data-part="frame">
        <div
          ref={stage}
          className={styles.stage}
          data-part="stage"
          data-failed={failed || undefined}
          onPointerMove={
            background
              ? undefined
              : event => {
                  const point = local(event)
                  if (point) renderer.current?.pointer(point.x, point.y)
                }
          }
          onPointerLeave={background ? undefined : () => renderer.current?.pointer(null)}
          onPointerDown={
            background
              ? undefined
              : event => {
                  const point = local(event)
                  if (point) renderer.current?.click(point.x, point.y)
                }
          }
        >
          <canvas ref={canvas} className={styles.canvas} />
        </div>
      </div>
    </div>
  )
}

export { GradientASCII }
