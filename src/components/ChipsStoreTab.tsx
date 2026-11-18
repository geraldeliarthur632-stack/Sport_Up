import React, { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Film,
  Package,
} from 'lucide-react';
import type { ChipWallet } from '../types/sportup';

interface ChipsStoreTabProps {
  chips: ChipWallet | null;
  onOpenAdReward: () => void;
  onPurchasePack: (packId: 'pack_5' | 'pack_15' | 'pack_40') => Promise<void>;
}

const PACKS: Array<{
  id: 'pack_5' | 'pack_15' | 'pack_40';
  title: string;
  chips: number;
  priceBrl: string;
  note: string;
}> = [
  {
    id: 'pack_5',
    title: 'Pacote Treino',
    chips: 5,
    priceBrl: 'R$ 6,90',
    note: 'Ideal para completar um módulo inteiro',
  },
  {
    id: 'pack_15',
    title: 'Pacote Titular',
    chips: 15,
    priceBrl: 'R$ 16,90',
    note: 'Economia de 18% · Nunca expiram',
  },
  {
    id: 'pack_40',
    title: 'Pacote Campeão',
    chips: 40,
    priceBrl: 'R$ 34,90',
    note: 'Melhor custo-benefício · Nunca expiram',
  },
];

export const ChipsStoreTab: React.FC<ChipsStoreTabProps> = ({
  chips,
  onOpenAdReward,
  onPurchasePack,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handlePack = async (packId: 'pack_5' | 'pack_15' | 'pack_40') => {
    setBusyId(packId);
    setFeedback(null);
    try {
      await onPurchasePack(packId);
      setFeedback('Pacote adicionado à sua conta e validado pelo servidor!');
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : 'Erro ao processar compra.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Loja de Fichas
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Validação segura no servidor para suas moedas diárias e pacotes permanentes.
        </p>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 text-xs font-bold text-emerald-900 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Wallet Summary */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {chips?.dailyChips ?? 0}
          </p>
          <p className="text-xs font-bold text-slate-600 mt-0.5">Diárias</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            3 por dia · Não acumulam
          </p>
        </div>

        <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-700 tabular-nums">
            {chips?.purchasedChips ?? 0}
          </p>
          <p className="text-xs font-bold text-amber-800 mt-0.5">Compradas</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Nunca expiram</p>
        </div>
      </section>

      {/* Rewarded Video Ad */}
      <section className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sky-900 font-extrabold text-base">
            <Film className="w-5 h-5 text-sky-600" />
            <span>Ganhe +1 ficha assistindo a um vídeo</span>
          </div>
          <p className="text-xs text-sky-800">
            Assista a 5 segundos de anúncio para liberar mais uma aula agora mesmo (hoje:{' '}
            <span className="font-bold tabular-nums">
              {chips?.adsWatchedToday ?? 0}/10
            </span>
            ).
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAdReward}
          className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm border-b-4 border-sky-700 whitespace-nowrap shrink-0 transition"
        >
          Assistir vídeo (+1)
        </button>
      </section>

      {/* Chip Packs */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Pacotes de Fichas Permanentes
          </h2>
          <p className="text-xs text-slate-500">
            Fichas compradas nunca expiram e só são gastas depois das fichas diárias.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className="bg-white border-2 border-slate-200 rounded-3xl p-4 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Package className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-extrabold text-emerald-700 tabular-nums">
                    {pack.priceBrl}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {pack.title}
                </h3>
                <p className="text-2xl font-extrabold text-amber-600 flex items-center gap-1 tabular-nums">
                  +{pack.chips} <Coins className="w-5 h-5" />
                </p>
                <p className="text-xs text-slate-500">{pack.note}</p>
              </div>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => handlePack(pack.id)}
                className="w-full min-h-[44px] rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-extrabold text-sm border-b-4 border-amber-600 transition"
              >
                {busyId === pack.id ? 'Processando...' : 'Comprar pacote'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
