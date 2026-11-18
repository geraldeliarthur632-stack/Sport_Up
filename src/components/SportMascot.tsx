import React, { useState } from 'react';
import { MASCOT_IMAGE_PATH } from '../data/sportsMeta';

interface SportMascotProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  mood?: 'happy' | 'cheer' | 'thinking';
}

export const SportMascot: React.FC<SportMascotProps> = ({
  message,
  size = 'md',
  mood = 'happy',
}) => {
  const [imgError, setImgError] = useState(false);

  const dims =
    size === 'sm'
      ? 'w-12 h-12'
      : size === 'lg'
        ? 'w-24 h-24'
        : 'w-16 h-16';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${dims} shrink-0 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm overflow-hidden flex items-center justify-center ${
          mood === 'cheer' ? 'animate-float-slow' : ''
        }`}
      >
        {!imgError ? (
          <img
            src={MASCOT_IMAGE_PATH}
            alt="Ararinha SportUp"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg viewBox="0 0 64 64" className="w-10 h-10">
            <circle cx="32" cy="32" r="28" fill="#16A34A" />
            <circle cx="24" cy="26" r="4" fill="#FFFFFF" />
            <circle cx="40" cy="26" r="4" fill="#FFFFFF" />
            <circle cx="25" cy="26" r="2" fill="#0F172A" />
            <circle cx="39" cy="26" r="2" fill="#0F172A" />
            <path d="M26 35 L32 42 L38 35 Z" fill="#FACC15" />
          </svg>
        )}
      </div>
      {message && (
        <div className="relative bg-white border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm max-w-md">
          <div className="hidden sm:block absolute -left-2 top-5 w-3 h-3 bg-white border-l-2 border-b-2 border-slate-200 rotate-45" />
          <p className="leading-snug">{message}</p>
        </div>
      )}
    </div>
  );
};
