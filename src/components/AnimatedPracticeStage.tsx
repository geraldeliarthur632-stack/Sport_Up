import React, { useEffect, useRef, useState } from 'react';
import { Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import type { PracticeKeyframe, SportId } from '../types/sportup';

interface AnimatedPracticeStageProps {
  sportId: SportId;
  steps: PracticeKeyframe[];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const AnimatedPracticeStage: React.FC<AnimatedPracticeStageProps> = ({
  sportId,
  steps,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [slowMotion, setSlowMotion] = useState(false);
  const [progress, setProgress] = useState(0); // 0 .. steps.length - 1
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const maxStep = Math.max(steps.length - 1, 1);

  useEffect(() => {
    setProgress(0);
    setIsPlaying(true);
  }, [steps]);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const stepSpeed = slowMotion ? 0.28 : 0.62; // steps per second

    const tick = (now: number) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = now;
      }
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      setProgress((prev) => {
        const next = prev + dt * stepSpeed;
        if (next >= maxStep) {
          return 0; // loop smoothly through demonstration
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, slowMotion, maxStep]);

  const idxA = Math.min(Math.floor(progress), maxStep);
  const idxB = Math.min(idxA + 1, maxStep);
  const t = progress - idxA;

  const kfA = steps[idxA] ?? steps[0];
  const kfB = steps[idxB] ?? kfA;

  const playerX = lerp(kfA.playerX, kfB.playerX, t);
  const playerY = lerp(kfA.playerY, kfB.playerY, t);
  const ballX = lerp(kfA.ballX, kfB.ballX, t);
  const ballY = lerp(kfA.ballY, kfB.ballY, t);
  const hasTeammate = kfA.teammateX != null && kfA.teammateY != null;
  const mateX = hasTeammate
    ? lerp(kfA.teammateX ?? 70, kfB.teammateX ?? kfA.teammateX ?? 70, t)
    : 0;
  const mateY = hasTeammate
    ? lerp(kfA.teammateY ?? 50, kfB.teammateY ?? kfA.teammateY ?? 50, t)
    : 0;

  const activePose = t < 0.5 ? kfA.pose : kfB.pose;
  const legSwing = Math.sin(progress * Math.PI * 2) * 5;
  const armRaise =
    activePose === 'shoot' || activePose === 'block' || activePose === 'jump'
      ? -12
      : activePose === 'swing'
        ? -7
        : 0;
  const jumpOffset = activePose === 'jump' || activePose === 'block' ? -7 : 0;

  const currentStepInfo = steps[idxA] ?? steps[0];

  const handleReplay = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  // Surface colors per sport
  const renderCourtBackground = () => {
    switch (sportId) {
      case 'futsal':
        return (
          <g>
            <rect width="400" height="220" rx="14" fill="#0284C7" />
            <rect x="14" y="14" width="372" height="192" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="2.5" />
            <line x1="200" y1="14" x2="200" y2="206" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="200" cy="110" r="28" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M14 66 A44 44 0 0 1 14 154" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M386 66 A44 44 0 0 0 386 154" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <rect x="6" y="88" width="8" height="44" fill="#E2E8F0" />
            <rect x="386" y="88" width="8" height="44" fill="#E2E8F0" />
          </g>
        );
      case 'futebol':
        return (
          <g>
            <rect width="400" height="220" rx="14" fill="#15803D" />
            <rect x="0" y="0" width="80" height="220" fill="#16A34A" opacity="0.4" />
            <rect x="160" y="0" width="80" height="220" fill="#16A34A" opacity="0.4" />
            <rect x="320" y="0" width="80" height="220" fill="#16A34A" opacity="0.4" />
            <rect x="14" y="14" width="372" height="192" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
            <line x1="200" y1="14" x2="200" y2="206" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="200" cy="110" r="30" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <rect x="14" y="54" width="56" height="112" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <rect x="330" y="54" width="56" height="112" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          </g>
        );
      case 'volei':
        return (
          <g>
            <rect width="400" height="220" rx="14" fill="#0369A1" />
            <rect x="24" y="20" width="352" height="180" fill="#F97316" stroke="#FFFFFF" strokeWidth="2.5" />
            <line x1="142" y1="20" x2="142" y2="200" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="258" y1="20" x2="258" y2="200" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 4" />
            <line x1="200" y1="12" x2="200" y2="208" stroke="#FFFFFF" strokeWidth="4" />
          </g>
        );
      case 'basquete':
        return (
          <g>
            <rect width="400" height="220" rx="14" fill="#FDBA74" />
            <rect x="14" y="14" width="372" height="192" fill="#FED7AA" stroke="#7C2D12" strokeWidth="2.5" />
            <line x1="200" y1="14" x2="200" y2="206" stroke="#7C2D12" strokeWidth="2" />
            <circle cx="200" cy="110" r="26" fill="none" stroke="#7C2D12" strokeWidth="2" />
            <rect x="306" y="76" width="80" height="68" fill="#EA580C" opacity="0.85" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M386 30 A95 95 0 0 0 386 190" fill="none" stroke="#7C2D12" strokeWidth="2" />
            <circle cx="372" cy="110" r="7" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
          </g>
        );
      case 'pingpong':
        return (
          <g>
            <rect width="400" height="220" rx="14" fill="#F1F5F9" />
            <rect x="44" y="34" width="312" height="152" rx="6" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="3" />
            <line x1="44" y1="110" x2="356" y2="110" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8" />
            <line x1="200" y1="26" x2="200" y2="194" stroke="#E2E8F0" strokeWidth="4" />
          </g>
        );
    }
  };

  const px = (playerX / 100) * 400;
  const py = (playerY / 100) * 220 + jumpOffset;
  const bx = (ballX / 100) * 400;
  const by = (ballY / 100) * 220;
  const mx = (mateX / 100) * 400;
  const my = (mateY / 100) * 220;

  return (
    <div className="space-y-4">
      {/* Stage Canvas */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 bg-slate-900 shadow-sm">
        <svg viewBox="0 0 400 220" className="w-full h-auto block">
          {renderCourtBackground()}

          {/* Ball trajectory dashed guide */}
          <line
            x1={px}
            y1={py}
            x2={bx}
            y2={by}
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.55"
          />

          {/* Teammate if present */}
          {hasTeammate && (
            <g transform={`translate(${mx}, ${my})`}>
              <ellipse cx="0" cy="17" rx="10" ry="4" fill="#0F172A" opacity="0.25" />
              <circle cx="0" cy="-14" r="6.5" fill="#FDE047" stroke="#0F172A" strokeWidth="1.5" />
              <rect x="-7" y="-7" width="14" height="15" rx="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
              <line x1="-4" y1="8" x2="-5" y2="17" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
              <line x1="4" y1="8" x2="5" y2="17" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}

          {/* Primary Animated Athlete */}
          <g transform={`translate(${px}, ${py})`}>
            <ellipse cx="0" cy={18 - jumpOffset} rx="12" ry="4.5" fill="#0F172A" opacity="0.3" />
            {/* Legs */}
            <line
              x1="-4"
              y1="7"
              x2={-5 + legSwing}
              y2="17"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="7"
              x2={5 - legSwing}
              y2="17"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Jersey Torso */}
            <rect
              x="-8"
              y="-8"
              width="16"
              height="16"
              rx="5"
              fill="#16A34A"
              stroke="#FFFFFF"
              strokeWidth="1.8"
            />
            {/* Arms */}
            <line
              x1="-8"
              y1="-4"
              x2="-14"
              y2={2 + armRaise}
              stroke="#FDBA74"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="-4"
              x2="15"
              y2={2 + armRaise}
              stroke="#FDBA74"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {sportId === 'pingpong' && (
              <circle cx="17" cy={2 + armRaise} r="4.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="1" />
            )}
            {/* Head */}
            <circle cx="0" cy="-15" r="7" fill="#FED7AA" stroke="#0F172A" strokeWidth="1.5" />
            <path d="M-7 -17 Q0 -23 7 -17" fill="#16A34A" />
          </g>

          {/* Animated Ball */}
          <g transform={`translate(${bx}, ${by})`}>
            <circle cx="0" cy="7" r="5" fill="#0F172A" opacity="0.22" />
            <circle
              cx="0"
              cy="0"
              r={sportId === 'pingpong' ? 4.5 : 6.5}
              fill={
                sportId === 'basquete'
                  ? '#F97316'
                  : sportId === 'volei'
                    ? '#FACC15'
                    : sportId === 'pingpong'
                      ? '#FFFFFF'
                      : '#FFFFFF'
              }
              stroke="#0F172A"
              strokeWidth="1.8"
            />
          </g>
        </svg>

        {/* Speed indicator badge */}
        <div className="absolute top-3 right-3 bg-slate-950/75 text-white text-xs font-semibold px-2.5 py-1 rounded-lg tabular-nums">
          {slowMotion ? 'Câmera Lenta 0.5x' : 'Velocidade 1.0x'}
        </div>
      </div>

      {/* Step Description Card */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-emerald-700">
          {currentStepInfo.label}
        </p>
        <p className="text-sm text-slate-800 mt-1 leading-relaxed">
          {currentStepInfo.description}
        </p>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsPlaying((v) => !v)}
          className="flex-1 min-w-[120px] min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm border-b-4 border-emerald-700 active:translate-y-0.5 transition"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? 'Pausar' : 'Play'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSlowMotion((v) => !v)}
          className={`min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm border-2 border-b-4 transition ${
            slowMotion
              ? 'bg-sky-500 border-sky-700 text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span className="whitespace-nowrap">Câmera lenta</span>
        </button>

        <button
          type="button"
          onClick={handleReplay}
          className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white border-2 border-slate-200 border-b-4 text-slate-700 hover:bg-slate-50 font-bold text-sm transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Repetir</span>
        </button>
      </div>

      {/* Step Jump Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((s, idx) => {
          const active = idxA === idx;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setProgress(idx);
                setIsPlaying(false);
              }}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold text-left border-2 transition ${
                active
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
