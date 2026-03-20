'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// A continuous SVG path that approximates the cursive "MOJO" text
// This path allows the airplane to travel along it in one smooth motion.
const mojoPath = "M 50 100 C 60 50 80 100 90 100 C 100 50 120 100 130 100 C 140 80 160 60 170 80 C 180 100 170 120 160 110 C 150 100 160 80 170 80 C 180 80 190 100 190 100 L 190 150 C 190 170 170 170 160 160 L 200 100 C 210 80 230 60 240 80 C 250 100 240 120 230 110 C 220 100 230 80 240 80"

export default function MojoSplash() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#e1662c] to-[#ec8b46]">
      
      {/* Background Circles - Subtle animated gradients */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 1 }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-white blur-3xl" 
      />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.05 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-white blur-3xl" 
      />

      <div className="relative w-full max-w-3xl aspect-video flex items-center justify-center">
        <svg 
          viewBox="0 0 300 200" 
          className="w-full h-full max-w-[600px]"
          style={{ overflow: 'visible' }}
        >
          {/* Defs for glow effect */}
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* The Text Path - "MOJO" Drawing Animation */}
          <motion.path
            d={mojoPath}
            fill="transparent"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: 3.5, 
              ease: "easeInOut",
              delay: 0.5 
            }}
            style={{ 
              filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' 
            }}
          />
          
          {/* The Airplane Icon - Following the path */}
          {/* We use a standard HTML/CSS animation approach for the offset-path 
              because Framer Motion's offsetPath support can be tricky with SVG elements directly */}
          <g style={{ 
            offsetPath: `path("${mojoPath}")`,
            animation: "movePlane 3.5s ease-in-out 0.5s forwards",
            offsetRotate: "auto 90deg" // Adjusts the rotation of the plane to follow the path
          }}>
            {/* Airplane Shape - Centered at 0,0 */}
            <motion.path 
              d="M0 -10 L8 10 L0 6 L-8 10 Z" // Stylized paper plane
              fill="white"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            />
          </g>
        </svg>
      </div>

      {/* Subtitle Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.8, duration: 1.0 }}
        className="mt-4 z-10"
      >
        <h2 className="text-white text-lg md:text-xl font-light tracking-[0.2em] uppercase font-sans">
          The Global Art Market
        </h2>
      </motion.div>

      <style jsx global>{`
        @keyframes movePlane {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
      `}</style>

    </div>
  )
}
