import React, { useState } from 'react';
import { ChevronDown, Coins, Flame, Sparkles } from 'lucide-react';
import type { ChipWallet } from '../types/sportup';
import { SportUpLogo } from './SportUpLogo';

interface TopBarProps {
  xp: number;
  streak: number;
  chips: ChipWallet | null;
  onOpenStore: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  xp,
  streak,
  chips,
  onOpenStore,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const isLoaded = chips !== null;
  const daily = chips?.dailyChips ?? 0;
  const purchased = chips?.purchasedChips ?? 0;
  const totalChips = daily + purchased;

  return (
    <header className="sticky top-0 z-30 h-[54px] bg-white/95 backdrop-blur-md border-b border-slate-200 px-4">
      <div className="max-w-5xl mx-auto h-full flex items-center justify-between gap-3">
        {/* Zone 1: Brand */}
        <div className="shrink-0">
          <SportUpLogo size="sm" />
        </div>

        {/* Zone 2: Streak & XP metrics */}
        <div className="flex items-center gap-4 text-xs sm:text-sm font-bold tabular-nums">
          <div
            className="flex items-center gap-1 text-orange-600"
            title="Sequência de dias"
          >
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            <span>{streak}</span>
          </div>
          <div className="flex items-center gap-1 text-amber-600" title="XP total">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>{xp} XP</span>
          </div>
        </div>

        {/* Zone 3: Chips/Coins Counter with breakdown popover */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 tabular-nums whitespace-nowrap hover:bg-amber-100 transition"
          >
            <Coins className="w-4 h-4 text-amber-600" />
            <span>{isLoaded ? totalChips : '...'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
          </button>

          {showBreakdown && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowBreakdown(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-4 z-40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">
                    Suas Moedas
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    3 renovam todo dia
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">
                      Diárias (renovam todo dia)
                    </span>
                    <span className="font-extrabold text-slate-900 tabular-nums">
                      {daily}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">
                      Compradas (não expiram)
                    </span>
                    <span className="font-extrabold text-amber-700 tabular-nums">
                      {purchased}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowBreakdown(false);
                    onOpenStore();
                  }}
                  className="w-full min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs border-b-4 border-emerald-700 transition"
                >
                  Obter mais fichas
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
