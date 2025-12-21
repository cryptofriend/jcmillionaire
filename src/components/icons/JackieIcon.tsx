import React from 'react';

interface JackieIconProps {
  className?: string;
  size?: number;
}

export const JackieIcon: React.FC<JackieIconProps> = ({ className = '', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chain link pattern - stylized J and C */}
      <circle cx="32" cy="32" r="30" fill="url(#goldGradient)" />
      <circle cx="32" cy="32" r="26" fill="hsl(45 30% 97%)" />
      
      {/* Cute Jackie face */}
      <circle cx="32" cy="34" r="18" fill="url(#goldGradient)" />
      
      {/* Eyes */}
      <ellipse cx="26" cy="32" rx="3" ry="4" fill="hsl(30 25% 15%)" />
      <ellipse cx="38" cy="32" rx="3" ry="4" fill="hsl(30 25% 15%)" />
      
      {/* Eye shine */}
      <circle cx="27" cy="31" r="1.5" fill="white" />
      <circle cx="39" cy="31" r="1.5" fill="white" />
      
      {/* Smile */}
      <path
        d="M25 40 Q32 46 39 40"
        stroke="hsl(30 25% 15%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Blush */}
      <circle cx="21" cy="38" r="3" fill="hsl(12 85% 75%)" opacity="0.6" />
      <circle cx="43" cy="38" r="3" fill="hsl(12 85% 75%)" opacity="0.6" />
      
      {/* Chain crown detail */}
      <path
        d="M20 22 L24 18 L28 22 L32 16 L36 22 L40 18 L44 22"
        stroke="url(#goldGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(38 92% 50%)" />
          <stop offset="50%" stopColor="hsl(45 90% 65%)" />
          <stop offset="100%" stopColor="hsl(38 92% 50%)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const CoinIcon: React.FC<JackieIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="11" fill="url(#coinGold)" stroke="hsl(30 60% 40%)" strokeWidth="1" />
      <circle cx="12" cy="12" r="8" fill="hsl(45 30% 97%)" />
      <text x="12" y="16" textAnchor="middle" fill="hsl(38 92% 50%)" fontWeight="bold" fontSize="10" fontFamily="Fredoka">JC</text>
      
      <defs>
        <linearGradient id="coinGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(38 92% 50%)" />
          <stop offset="50%" stopColor="hsl(45 90% 65%)" />
          <stop offset="100%" stopColor="hsl(38 92% 50%)" />
        </linearGradient>
      </defs>
    </svg>
  );
};
