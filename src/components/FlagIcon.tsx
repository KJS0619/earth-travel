'use client';

import React, { useState } from 'react';

interface FlagIconProps {
  code: string;           // ISO 3166-1 alpha-2 country code (e.g., 'KR', 'US')
  fallbackEmoji?: string; // Fallback emoji if image fails to load
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

// Size configurations: width in pixels
const SIZE_CONFIG = {
  xs: { width: 16, cdnWidth: 20 },
  sm: { width: 20, cdnWidth: 40 },
  md: { width: 28, cdnWidth: 40 },
  lg: { width: 36, cdnWidth: 80 },
  xl: { width: 48, cdnWidth: 80 },
};

// Special country code mappings (for territories/special regions)
const CODE_MAPPINGS: Record<string, string> = {
  'XK': 'xk', // Kosovo (not always supported)
};

/**
 * Get FlagCDN URL for a country code
 * @param code - ISO 3166-1 alpha-2 country code
 * @param width - CDN width (20, 40, 80, 160, 320)
 */
export function getFlagUrl(code: string, width: number = 40): string {
  const mappedCode = CODE_MAPPINGS[code] || code.toLowerCase();
  return `https://flagcdn.com/w${width}/${mappedCode}.png`;
}

/**
 * FlagIcon Component
 * Displays a high-quality flag image from FlagCDN with emoji fallback
 */
export default function FlagIcon({
  code,
  fallbackEmoji = '🏳️',
  size = 'md',
  className = '',
  showBorder = true,
}: FlagIconProps) {
  const [hasError, setHasError] = useState(false);
  const { width, cdnWidth } = SIZE_CONFIG[size];

  // Calculate height maintaining 3:2 aspect ratio (common flag ratio)
  const height = Math.round(width * (2 / 3));

  if (hasError || !code) {
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width, height, fontSize: height * 0.9 }}
      >
        {fallbackEmoji}
      </span>
    );
  }

  const borderClass = showBorder
    ? 'border border-slate-700/30 shadow-sm'
    : '';

  return (
    <img
      src={getFlagUrl(code, cdnWidth)}
      alt={`${code} flag`}
      width={width}
      height={height}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`rounded-sm object-cover ${borderClass} ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * Inline flag for text/badges - smaller with tighter spacing
 */
export function FlagBadge({
  code,
  fallbackEmoji = '🏳️',
  className = '',
}: {
  code: string;
  fallbackEmoji?: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !code) {
    return <span className={className}>{fallbackEmoji}</span>;
  }

  return (
    <img
      src={getFlagUrl(code, 20)}
      alt={`${code} flag`}
      width={16}
      height={11}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`inline-block rounded-[2px] border border-slate-600/30 ${className}`}
      style={{ width: 16, height: 11 }}
    />
  );
}
