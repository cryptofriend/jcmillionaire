import React from 'react';
import { motion } from 'framer-motion';
import jcCoinImage from '@/assets/jc-coin.png';

const FloatingCoin: React.FC = () => {
  return (
    <div className="fixed bottom-24 right-4 z-40 pointer-events-none">
      <motion.div
        className="relative w-16 h-16"
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Glow effect behind coin */}
        <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
        
        {/* Spinning coin with 3D effect */}
        <motion.div
          className="relative w-full h-full"
          style={{ 
            transformStyle: 'preserve-3d',
            perspective: '1000px',
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
          <img
            src={jcCoinImage}
            alt="JC Coin"
            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,193,7,0.5)]"
            style={{
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
