'use client'

import React, { useEffect, useState } from 'react'

const mojoPath = "M 50 100 C 60 50 80 100 90 100 C 100 50 120 100 130 100 C 140 80 160 60 170 80 C 180 100 170 120 160 110 C 150 100 160 80 170 80 C 180 80 190 100 190 100 L 190 150 C 190 170 170 170 160 160 L 200 100 C 210 80 230 60 240 80 C 250 100 240 120 230 110 C 220 100 230 80 240 80"

export default function MojoSplash() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#e1662c] to-[#ec8b46]">
      <div className="splash-bg-circle splash-bg-circle-1" />
      <div className="splash-bg-circle splash-bg-circle-2" />

      <div className="relative w-full max-w-3xl aspect-video flex items-center justify-center">
        <svg
          viewBox="0 0 300 200"
          className="w-full h-full max-w-[600px]"
          style={{ overflow: 'visible' }}
        >
          <path
            d={mojoPath}
            fill="transparent"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="splash-draw-path"
            style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
          />

          <g style={{
            offsetPath: `path("${mojoPath}")`,
            animation: 'movePlane 3.5s ease-in-out 0.5s forwards',
            offsetRotate: 'auto 90deg',
          }}>
            <path
              d="M0 -10 L8 10 L0 6 L-8 10 Z"
              fill="white"
              className="splash-plane"
            />
          </g>
        </svg>
      </div>

      <div className="splash-subtitle mt-4 z-10">
        <h2 className="text-white text-lg md:text-xl font-light tracking-[0.2em] uppercase font-sans">
          The Global Art Market
        </h2>
      </div>

      <style>{`
        .splash-bg-circle {
          position: absolute;
          border-radius: 50%;
          background: white;
          filter: blur(48px);
          animation: splashFadeIn 1s ease forwards;
          opacity: 0;
        }
        .splash-bg-circle-1 {
          top: -10%; left: -10%; width: 50vw; height: 50vw;
          animation-delay: 0s;
        }
        .splash-bg-circle-2 {
          bottom: 10%; right: 10%; width: 40vw; height: 40vw;
          animation-delay: 0.5s;
        }
        @keyframes splashFadeIn {
          to { opacity: 0.1; }
        }
        .splash-draw-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawPath 3.5s ease-in-out 0.5s forwards;
          opacity: 0;
        }
        @keyframes drawPath {
          0% { stroke-dashoffset: 1000; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        .splash-plane {
          opacity: 0;
          animation: planeAppear 0.3s ease 0.5s forwards;
        }
        @keyframes planeAppear {
          to { opacity: 1; }
        }
        @keyframes movePlane {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
        .splash-subtitle {
          opacity: 0;
          transform: translateY(20px);
          animation: subtitleIn 1s ease 3.8s forwards;
        }
        @keyframes subtitleIn {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
