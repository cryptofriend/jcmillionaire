import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jcCoinImage from '@/assets/jc-coin.png';

const FloatingCoin: React.FC = () => {
  const [tapBurst, setTapBurst] = useState(false);

  const handleTap = () => {
    setTapBurst(true);
    setTimeout(() => setTapBurst(false), 600);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      <motion.div
        className="relative w-16 h-16 cursor-pointer pointer-events-auto"
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        whileTap={{ scale: 0.85 }}
        onTap={handleTap}
      >
        {/* Glow effect behind coin */}
        <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
        
        {/* Tap burst particles */}
        <AnimatePresence>
          {tapBurst && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-primary rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  initial={{ 
                    x: '-50%', 
                    y: '-50%', 
                    scale: 0,
                    opacity: 1 
                  }}
                  animate={{ 
                    x: `calc(-50% + ${Math.cos(i * 45 * Math.PI / 180) * 40}px)`,
                    y: `calc(-50% + ${Math.sin(i * 45 * Math.PI / 180) * 40}px)`,
                    scale: [0, 1.2, 0],
                    opacity: [1, 1, 0]
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              ))}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary"
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </>
          )}
        </AnimatePresence>
        
        {/* 3D Spinning coin */}
        <motion.div
          className="relative w-full h-full"
          style={{ 
            transformStyle: 'preserve-3d',
            perspective: '500px',
          }}
          animate={{
            rotateY: [0, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Coin front face */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              transform: 'translateZ(4px)',
              backfaceVisibility: 'hidden',
            }}
          >
            <img
              src={jcCoinImage}
              alt="JC Coin"
              className="w-full h-full object-contain"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3)) drop-shadow(0 0 20px rgba(255,193,7,0.6))',
              }}
            />
          </div>
          
          {/* Coin back face */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              transform: 'rotateY(180deg) translateZ(4px)',
              backfaceVisibility: 'hidden',
            }}
          >
            <img
              src={jcCoinImage}
              alt="JC Coin Back"
              className="w-full h-full object-contain"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3)) drop-shadow(0 0 20px rgba(255,193,7,0.6)) brightness(0.9)',
              }}
            />
          </div>
          
          {/* Coin edge (thickness) */}
          <div
            className="absolute inset-[2px] rounded-full bg-gradient-to-b from-yellow-400 via-yellow-600 to-yellow-400"
            style={{
              transform: 'rotateY(90deg)',
              width: '8px',
              left: 'calc(50% - 4px)',
              backfaceVisibility: 'visible',
            }}
          />
        </motion.div>
        
        {/* Sparkle particles */}
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0,
          }}
        />
        <motion.div
          className="absolute top-2 -left-1 w-1.5 h-1.5 bg-primary rounded-full"
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 0.5,
          }}
        />
        <motion.div
          className="absolute -bottom-0.5 right-2 w-1 h-1 bg-primary rounded-full"
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: 1,
          }}
        />
      </motion.div>
    </div>
  );
};

export default FloatingCoin;
