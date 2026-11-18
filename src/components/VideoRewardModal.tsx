import React, { useEffect, useState } from 'react';
import { Film, Play, X } from 'lucide-react';

interface VideoRewardModalProps {
  onClose: () => void;
  onClaimReward: () => Promise<void>;
}

export const VideoRewardModal: React.FC<VideoRewardModalProps> = ({
  onClose,
  onClaimReward,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const handleFinish = async () => {
    setClaiming(true);
    try {
      await onClaimReward();
      onClose();
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden border-2 border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Film className="w-4 h-4 text-sky-500" />
            <span>Anúncio em vídeo recompensado</span>
          </div>
          {secondsLeft === 0 && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="bg-slate-900 p-8 text-center text-white space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto">
            <Play className="w-8 h-8 text-emerald-400 fill-emerald-400" />
          </div>
          <h3 className="text-lg font-extrabold">
            SportUp Pro · Treine sem limites
          </h3>
          <p className="text-xs text-slate-300">
            {secondsLeft > 0
              ? `Sua ficha bônus será liberada em ${secondsLeft}s...`
              : 'Recompensa liberada! Resgate +1 ficha agora.'}
          </p>
        </div>

        <div className="p-4">
          <button
            type="button"
            disabled={secondsLeft > 0 || claiming}
            onClick={handleFinish}
            className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 text-white font-extrabold text-sm border-b-4 border-emerald-700 transition"
          >
            {claiming
              ? 'Validando no servidor...'
              : secondsLeft > 0
                ? `Aguarde (${secondsLeft}s)`
                : 'Resgatar +1 Ficha'}
          </button>
        </div>
      </div>
    </div>
  );
};
