import React from 'react';

interface WorldIdIconProps {
  size?: number;
  className?: string;
}

/**
 * World ID Logo - the official Worldcoin "orb" icon
 */
export const WorldIdIcon: React.FC<WorldIdIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Inner circle (iris) */}
      <circle
        cx="16"
        cy="16"
        r="6"
        fill="currentColor"
      />
      {/* Horizontal line through iris */}
      <rect
        x="2"
        y="14.5"
        width="28"
        height="3"
        fill="currentColor"
        mask="url(#worldid-mask)"
      />
      {/* Mask to cut out the center */}
      <defs>
        <mask id="worldid-mask">
          <rect x="0" y="0" width="32" height="32" fill="white" />
          <circle cx="16" cy="16" r="10" fill="black" />
        </mask>
      </defs>
    </svg>
  );
};

/**
 * "Rate us" badge component that opens rating dialog
 */
export const WorldIdBadge: React.FC<{ className?: string; onRateClick?: () => void }> = ({ className = '', onRateClick }) => {
  return (
    <button 
      onClick={onRateClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium hover:bg-black/80 transition-colors ${className}`}
    >
      <span>Rate us 🙏</span>
    </button>
  );
};

/**
 * "Powered by World ID" text badge
 */
export const PoweredByWorldId: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-2 text-muted-foreground ${className}`}>
      <WorldIdIcon size={18} className="text-foreground" />
      <span className="text-xs">Powered by World ID</span>
    </div>
  );
};
