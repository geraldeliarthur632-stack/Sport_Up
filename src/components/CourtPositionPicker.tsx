import React from 'react';
import type { SportId } from '../types/sportup';

interface PositionZone {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface CourtPositionPickerProps {
  sportId: SportId;
  zones: PositionZone[];
  selectedZoneId: string | null;
  correctZoneId?: string;
  showResult?: boolean;
  onSelect: (zoneId: string) => void;
}

export const CourtPositionPicker: React.FC<CourtPositionPickerProps> = ({
  sportId,
  zones,
  selectedZoneId,
  correctZoneId,
  showResult = false,
  onSelect,
}) => {
  const bg =
    sportId === 'futebol'
      ? 'bg-emerald-700'
      : sportId === 'futsal'
        ? 'bg-sky-600'
        : sportId === 'volei'
          ? 'bg-orange-500'
          : sportId === 'basquete'
            ? 'bg-amber-600'
            : 'bg-blue-700';

  return (
    <div
      className={`relative w-full aspect-[16/9] rounded-2xl ${bg} border-2 border-slate-200 overflow-hidden select-none shadow-inner`}
    >
      {/* Court markings overlay */}
      <svg viewBox="0 0 100 56" className="absolute inset-0 w-full h-full pointer-events-none">
        <rect x="3" y="3" width="94" height="50" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.85" />
        <line x1="50" y1="3" x2="50" y2="53" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.85" />
        <circle cx="50" cy="28" r="8" fill="none" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.75" />
        <rect x="3" y="15" width="14" height="26" fill="none" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.75" />
        <rect x="83" y="15" width="14" height="26" fill="none" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.75" />
      </svg>

      {zones.map((zone) => {
        const isSelected = selectedZoneId === zone.id;
        const isCorrect = showResult && correctZoneId === zone.id;
        const isWrong = showResult && isSelected && correctZoneId !== zone.id;

        let btnStyle = 'bg-white text-slate-900 border-slate-300 hover:scale-105';
        if (isCorrect) {
          btnStyle = 'bg-emerald-500 text-white border-emerald-700 scale-105';
        } else if (isWrong) {
          btnStyle = 'bg-rose-500 text-white border-rose-700';
        } else if (isSelected) {
          btnStyle = 'bg-sky-500 text-white border-sky-700 scale-105';
        }

        return (
          <button
            key={zone.id}
            type="button"
            disabled={showResult}
            onClick={() => onSelect(zone.id)}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 border-b-4 shadow-md transition-transform whitespace-nowrap ${btnStyle}`}
          >
            {zone.label}
          </button>
        );
      })}
    </div>
  );
};
