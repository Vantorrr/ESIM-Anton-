'use client'

import { useState, useEffect } from 'react'
import { Play } from 'lucide-react'

export default function MojoAnimationPage() {
  const [stage, setStage] = useState(0) // 0: Initial, 1: Move, 2: Showreel, 3: Switch, 4: Final

  useEffect(() => {
    // Sequence timing
    const timers = [
      setTimeout(() => setStage(1), 1000), // Start move at 1s
      setTimeout(() => setStage(2), 2200), // Show showreel at 2.2s
      setTimeout(() => setStage(3), 3500), // Theme switch at 3.5s
      setTimeout(() => setStage(4), 4500), // Final state at 4.5s
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-700 ease-in-out ${stage >= 3 ? 'bg-white' : 'bg-black'}`}>
      
      {/* Logo Container */}
      <div 
        className="absolute transition-all duration-[1200ms] cubic-bezier(0.76, 0, 0.24, 1)"
        style={{
          top: stage >= 1 ? '2rem' : '50%',
          left: stage >= 1 ? '2rem' : '50%',
          transform: stage >= 1 ? 'translate(0, 0) scale(0.4)' : 'translate(-50%, -50%) scale(1)',
          transformOrigin: 'top left'
        }}
      >
        <h1 
          className={`text-8xl font-bold tracking-tighter transition-colors duration-700 ${stage >= 3 ? 'text-black' : 'text-white'}`}
          style={{ fontFamily: 'Inter, sans-serif' }} // Assuming Inter or similar
        >
          MOJO
        </h1>
      </div>

      {/* Showreel Call to Action */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 transition-all duration-500 ${stage === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
      >
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
          <Play fill="black" className="ml-1" size={32} />
        </div>
        <span className="text-white font-medium tracking-[0.2em] text-sm">SHOWREEL</span>
      </div>

      {/* Video Container (Final State) */}
      <div 
        className={`absolute inset-0 z-0 flex items-center justify-center transition-opacity duration-1000 ${stage >= 4 ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="w-full h-full max-w-6xl max-h-[80vh] bg-gray-100 rounded-lg overflow-hidden shadow-2xl mx-4 mt-20">
            {/* Placeholder for video */}
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                <video 
                    src="/MOJO anim_2.mp4" 
                    className="w-full h-full object-cover"
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                />
            </div>
        </div>
      </div>

      {/* Replay Button (for demo purposes) */}
      <button 
        onClick={() => window.location.reload()}
        className={`fixed bottom-8 right-8 px-4 py-2 bg-gray-200 rounded-full text-xs font-medium opacity-50 hover:opacity-100 transition-opacity ${stage >= 4 ? 'block' : 'hidden'}`}
      >
        Replay Animation
      </button>

    </div>
  )
}
