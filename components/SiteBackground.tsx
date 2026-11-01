'use client'

import GradientASCII from './gradient-ascii/gradient-ascii'

/** Full-page ASCII horizon. Dark greens and low opacity so the board stays primary. */
export default function SiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <GradientASCII
        background
        colorScheme="dark"
        colors={['#022c16', '#064e3b', '#14532d', '#166534']}
        shape="horizon"
        characters=" =+xX0S8#@"
        cellSize={18}
        density={0.48}
        glyphOpacity={0.28}
        glow={0.05}
        depthOfField={0}
        flicker={0.1}
        softness={0.55}
        scale={1}
        flow={0.5}
        speed={1}
        gradientOpacity={0.2}
        grain={0.04}
        variation={0}
        mouseInteraction
        scrambleRadius={0.1}
        clickEffect="wave"
        intro
        lightMode={false}
      />
    </div>
  )
}
