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
 * "Follow us on X" badge component with link
 */
export const WorldIdBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <a 
      href="https://x.com/iamjackiechain" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium hover:bg-black/80 transition-colors ${className}`}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span>Follow us on X</span>
    </a>
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
