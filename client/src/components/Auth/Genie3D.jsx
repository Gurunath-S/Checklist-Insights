import React, { useEffect, useState } from 'react';
import genieImg from '../../assets/genie.png';

const Genie3D = ({ mouseCoords }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const w = window.innerWidth || 1000;
    const h = window.innerHeight || 800;
    // Calculate normalized offset from center [-1, 1]
    const nx = (mouseCoords.x / w) * 2 - 1;
    const ny = (mouseCoords.y / h) * 2 - 1;

    // Set maximum rotation of 12 degrees
    setTilt({
      x: -ny * 12,
      y: nx * 12,
      px: nx * 15,
      py: ny * 15
    });
  }, [mouseCoords]);

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-visible select-none py-10" style={{ perspective: '1200px' }}>
      <style>
        {`
          @keyframes floatGenie {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(1deg); }
          }
          .anim-float-container {
            animation: floatGenie 6s ease-in-out infinite;
            transform-style: preserve-3d;
          }
        `}
      </style>

      {/* Floating 3D Wrapper */}
      <div 
        className="anim-float-container w-[350px] h-[350px] lg:w-[420px] lg:h-[420px] relative flex items-center justify-center transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {/* ================= LAYER 1: Deep Background Glow Aura ================= */}
        <div 
          className="absolute w-[280px] h-[280px] rounded-full bg-gradient-to-tr from-primary/30 to-accent/30 blur-[60px] opacity-70 transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${tilt.py * -0.5}px, ${tilt.px * 0.5}px, -40px)`,
          }}
        />

        {/* ================= LAYER 2: Glassmorphic Frame Backdrop ================= */}
        <div 
          className="absolute inset-4 rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${tilt.px * 0.2}px, ${tilt.py * 0.2}px, 0px)`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
          }}
        />

        {/* ================= LAYER 3: Magical Sparkle Particles (Removed) ================= */}

        {/* ================= LAYER 4: Official Mascot Graphic ================= */}
        <div 
          className="absolute inset-0 flex items-center justify-center p-8 transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${tilt.px * 0.7}px, ${tilt.py * 0.7}px, 50px) scale(1.05)`,
            filter: 'drop-shadow(0 20px 30px rgba(15, 23, 42, 0.45))',
          }}
        >
          <img 
            src={genieImg} 
            alt="Checklist Genie Mascot" 
            className="w-full h-full object-contain" 
          />
        </div>

        {/* ================= LAYER 5: Front Layer Holographic Light Flare ================= */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none opacity-20 transition-all duration-300 ease-out"
          style={{
            background: `radial-gradient(circle at ${50 + (tilt.y * 3)}% ${50 + (tilt.x * 3)}%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
            transform: `translate3d(0, 0, 80px)`,
          }}
        />
      </div>
    </div>
  );
};

export default Genie3D;
