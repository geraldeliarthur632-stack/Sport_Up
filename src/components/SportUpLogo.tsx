import React from 'react';

interface SportUpLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
}

const MARK_SIZES = {
  xs: 'w-7 h-7',
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const TEXT_SIZES = {
  xs: 'text-base',
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

export const SportUpLogo: React.FC<SportUpLogoProps> = ({
  size = 'sm',
  showWordmark = true,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        fill="none"
        aria-label="Logo SportUp"
        className={`${MARK_SIZES[size]} shrink-0 drop-shadow-xs`}
      >
        <defs>
          <linearGradient
            id="sportup-logo-bg"
            x1="64"
            y1="32"
            x2="448"
            y2="480"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="55%" stopColor="#16A34A" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
          <linearGradient
            id="sportup-trophy-gold"
            x1="170"
            y1="110"
            x2="342"
            y2="340"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient
            id="sportup-trophy-rim"
            x1="256"
            y1="104"
            x2="256"
            y2="152"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FEF08A" />
          </linearGradient>
        </defs>

        <rect width="512" height="512" rx="116" fill="url(#sportup-logo-bg)" />
        <rect
          x="14"
          y="14"
          width="484"
          height="484"
          rx="102"
          stroke="#FFFFFF"
          strokeOpacity="0.22"
          strokeWidth="6"
        />
        <circle cx="256" cy="256" r="182" fill="#FFFFFF" fillOpacity="0.11" />

        {/* Alças da Taça */}
        <path
          d="M168 152H122C106 152 96 164 98 182C102 224 132 258 176 268"
          stroke="#FEF08A"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M344 152H390C406 152 416 164 414 182C410 224 380 258 336 268"
          stroke="#F59E0B"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Base da Taça */}
        <rect x="170" y="384" width="172" height="34" rx="14" fill="#FFFFFF" />
        <rect x="192" y="352" width="128" height="36" rx="10" fill="#FACC15" />

        {/* Haste */}
        <path d="M232 296H280L292 356H220L232 296Z" fill="#F59E0B" />
        <rect x="218" y="330" width="76" height="14" rx="7" fill="#FEF08A" />

        {/* Corpo da Taça */}
        <path
          d="M162 122C162 114 168 108 176 108H336C344 108 350 114 350 122V198C350 258 308 308 256 312C204 308 162 258 162 198V122Z"
          fill="url(#sportup-trophy-gold)"
          stroke="#FFFFFF"
          strokeWidth="10"
          strokeLinejoin="round"
        />

        {/* Borda superior da Taça */}
        <rect x="150" y="102" width="212" height="24" rx="12" fill="url(#sportup-trophy-rim)" />

        {/* Estrela de Campeão */}
        <path
          d="M256 156L271 188L306 193L280 217L287 252L256 235L225 252L232 217L206 193L241 188L256 156Z"
          fill="#FFFFFF"
          stroke="#D97706"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark && (
        <span
          className={`font-display font-extrabold tracking-tight leading-none whitespace-nowrap ${TEXT_SIZES[size]}`}
        >
          <span className="text-slate-900">Sport</span>
          <span className="text-emerald-600">Up</span>
        </span>
      )}
    </div>
  );
};
