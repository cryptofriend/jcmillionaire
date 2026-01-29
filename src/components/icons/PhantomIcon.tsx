import React from 'react';

interface PhantomIconProps {
  size?: number;
  className?: string;
}

export const PhantomIcon: React.FC<PhantomIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="64" cy="64" r="64" fill="url(#phantom-gradient)" />
      <path
        d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4125 64.0026C13.9424 87.2828 35.5063 107 58.9536 107H63.0769C83.8968 107 110.584 85.9946 110.584 64.9142Z"
        fill="url(#phantom-gradient-inner)"
      />
      <path
        d="M77.8896 68.0715C77.8896 72.5091 74.3521 76.1087 79.9954 76.1087C85.6387 76.1087 90.9954 72.5091 90.9954 68.0715C90.9954 63.6339 85.6387 60.0343 79.9954 60.0343C74.3521 60.0343 77.8896 63.6339 77.8896 68.0715Z"
        fill="white"
      />
      <path
        d="M49.8896 68.0715C49.8896 72.5091 46.3521 76.1087 51.9954 76.1087C57.6387 76.1087 62.9954 72.5091 62.9954 68.0715C62.9954 63.6339 57.6387 60.0343 51.9954 60.0343C46.3521 60.0343 49.8896 63.6339 49.8896 68.0715Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="phantom-gradient"
          x1="64"
          y1="0"
          x2="64"
          y2="128"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#534BB1" />
          <stop offset="1" stopColor="#551BF9" />
        </linearGradient>
        <linearGradient
          id="phantom-gradient-inner"
          x1="62.5"
          y1="23"
          x2="62.5"
          y2="107"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#E8E8E8" />
        </linearGradient>
      </defs>
    </svg>
  );
};
