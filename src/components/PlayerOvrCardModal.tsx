import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader2,
  Sparkles,
  Square,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  evaluateSkillVideoWithAI,
  SPORT_OVR_STATS,
  SPORT_VIDEO_SKILLS,
} from '../lib/aiApi';
import type { SportId, TeamMember } from '../types/sportup';

interface PlayerOvrCardProps {
  member: TeamMember;
  sportId: SportId;
  canEvaluate: boolean;
  unlocked: boolean;
  onOpenEvaluate: (member: TeamMember) => void;
}

export const PlayerOvrCard: React.FC<PlayerOvrCardProps> = ({
  member,
  sportId,
  canEvaluate,
  unlocked,
  onOpenEvaluate,
}) => {
  const statDefs = SPORT_OVR_STATS[sportId];
  const hasOvr = typeof member.ovr === 'number' && member.ovr > 0;
  const ovr = member.ovr ?? 0;

  // Crisp, light-mode-friendly collectible tier framing
  const tierStyles = !hasOvr
    ? 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'
    : ovr >= 85
      ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-amber-400 dark:from-amber-950/70 dark:via-slate-900 dark:to-amber-900/50 dark:border-amber-500'
      : ovr >= 75
        ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-400 dark:from-emerald-950/60 dark:via-slate-900 dark:to-teal-950/50 dark:border-emerald-500'
        : 'bg-gradient-to-br from-sky-50 via-white to-slate-100 border-sky-300 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:border-sky-600';

  const ovrTextClass = !hasOvr
    ? 'text-slate-400 dark:text-slate-500'
    : ovr >= 85
      ? 'text-amber-700 dark:text-amber-300'
      : ovr >= 75
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-sky-700 dark:text-sky-300';

  return (
    <div
      className={`rounded-3xl border-2 border-b-4 p-4 flex flex-col justify-between gap-3 shadow-sm transition ${tierStyles}`}
    >
      {/* Top Row: OVR + Position + Avatar */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p
            className={`text-3xl font-extrabold leading-none tabular-nums ${ovrTextClass}`}
          >
            {hasOvr ? ovr : '--'}
          </p>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            OVR · #{member.jerseyNumber || '0'}
          </p>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
            {member.position || 'Geral'}
          </p>
        </div>

        {member.photoURL ? (
          <img
            src={member.photoURL}
            alt={member.displayName}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-sm shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-white/90 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center font-extrabold text-base text-slate-800 dark:text-slate-100 shrink-0">
            {member.displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Player Name */}
      <div className="border-b border-slate-200/80 dark:border-slate-700 pb-2">
        <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
          {member.displayName}
        </p>
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
          {member.lastVideoSkill
            ? `Vídeo: ${member.lastVideoSkill}`
            : 'Sem vídeo avaliado ainda'}
        </p>
      </div>

      {/* 6 Attribute Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums">
        {statDefs.map((st) => {
          const val = member.ovrAttributes?.[st.code];
          return (
            <div key={st.code} className="flex items-center justify-between">
              <span className="font-bold text-slate-500 dark:text-slate-400">
                {st.code}
              </span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100">
                {typeof val === 'number' ? val : '--'}
              </span>
            </div>
          );
        })}
      </div>

      {/* AI Video Note */}
      {member.aiSummary && (
        <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300 bg-white/75 dark:bg-slate-800/70 rounded-xl p-2 line-clamp-3">
          {member.aiSummary}
        </p>
      )}

      {/* Action CTA */}
      {canEvaluate && (
        <button
          type="button"
          disabled={!unlocked}
          onClick={() => onOpenEvaluate(member)}
          className={`w-full min-h-[40px] px-3 py-2 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 border-b-4 transition ${
            !unlocked
              ? 'bg-slate-200 border-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
              : hasOvr
                ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100'
                : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700 text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>
            {!unlocked
              ? 'Complete o time para liberar'
              : hasOvr
                ? 'Atualizar Over c/ Vídeo'
                : 'Enviar Vídeo & Gerar Over'}
          </span>
        </button>
      )}
    </div>
  );
};

interface VideoOvrModalProps {
  member: TeamMember;
  sportId: SportId;
  onClose: () => void;
  onSaveEvaluation: (
    memberUid: string,
    payload: {
      ovr: number;
      ovrAttributes: Record<string, number>;
      lastVideoSkill: string;
      aiSummary: string;
    }
  ) => Promise<void>;
}

export const VideoOvrModal: React.FC<VideoOvrModalProps> = ({
  member,
  sportId,
  onClose,
  onSaveEvaluation,
}) => {
  const skills = SPORT_VIDEO_SKILLS[sportId];
  const statDefs = SPORT_OVR_STATS[sportId];
  const [skillType, setSkillType] = useState(skills[0]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ovr: number;
    ovrAttributes: Record<string, number>;
    videoSummary: string;
    strengths: string;
    improvementTip: string;
  } | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const startCameraRecording = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }
      }, 60);

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        stopCamera();
        setVideoBlob(blob);
        setVideoPreviewUrl(URL.createObjectURL(blob));
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      stopCamera();
      setError(
        'Não foi possível abrir a câmera ao vivo. Você ainda pode enviar um vídeo pronto da galeria!'
      );
    }
  };

  const stopCameraRecording = () => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stopCamera();
    setError(null);
    setResult(null);
    setVideoBlob(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleAnalyze = async () => {
    if (!videoBlob) {
      setError('Grave ou selecione um vídeo curto primeiro.');
      return;
    }
    setError(null);
    setEvaluating(true);
    try {
      const evalRes = await evaluateSkillVideoWithAI({
        sportId,
        playerName: member.displayName,
        position: member.position,
        skillType,
        videoBlob,
        mimeType: videoBlob.type,
      });
      setResult(evalRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao avaliar vídeo.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!result) return;
    setSaving(true);
    setError(null);
    try {
      await onSaveEvaluation(member.uid, {
        ovr: result.ovr,
        ovrAttributes: result.ovrAttributes,
        lastVideoSkill: skillType,
        aiSummary: `${result.videoSummary} Dica: ${result.improvementTip}`.slice(
          0,
          560
        ),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar Over.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl border-2 border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
              Avaliação de Vídeo com IA
            </p>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Gerar Over · {member.displayName}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {member.position || 'Jogador'} · Camisa #{member.jerseyNumber || '0'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Skill Selector */}
        <div>
          <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1.5">
            Qual jogada ou fundamento você está fazendo no vídeo?
          </label>
          <select
            value={skillType}
            onChange={(e) => setSkillType(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
          >
            {skills.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Record / Upload Controls */}
        <div className="grid grid-cols-2 gap-2.5">
          {!recording ? (
            <button
              type="button"
              onClick={startCameraRecording}
              className="min-h-[46px] px-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-300 text-sky-900 font-extrabold text-xs flex items-center justify-center gap-1.5 dark:bg-sky-950/50 dark:border-sky-700 dark:text-sky-200"
            >
              <Camera className="w-4 h-4" />
              <span>Gravar agora</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCameraRecording}
              className="min-h-[46px] px-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Parar gravação</span>
            </button>
          )}

          <label className="min-h-[46px] px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-900 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-200">
            <Upload className="w-4 h-4" />
            <span>Enviar vídeo pronto</span>
            <input
              type="file"
              accept="video/*"
              capture="environment"
              onChange={handleFilePick}
              className="hidden"
            />
          </label>
        </div>

        {cameraActive && (
          <div className="rounded-2xl overflow-hidden bg-slate-900 border-2 border-sky-400">
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full max-h-56 object-cover"
            />
          </div>
        )}

        {videoPreviewUrl && !cameraActive && (
          <div className="rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 dark:border-slate-700">
            <video
              src={videoPreviewUrl}
              controls
              className="w-full max-h-56"
            />
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200">
            {error}
          </div>
        )}

        {videoBlob && !result && (
          <button
            type="button"
            disabled={evaluating}
            onClick={handleAnalyze}
            className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-extrabold text-sm border-b-4 border-emerald-700 flex items-center justify-center gap-2 transition"
          >
            {evaluating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>IA analisando jogada...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Avaliar vídeo com IA e calcular Over</span>
              </>
            )}
          </button>
        )}

        {/* AI Result Preview */}
        {result && (
          <div className="bg-amber-50/70 dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-600 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300">
                  Carta do Plano de Jogo gerada!
                </p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {member.displayName} · {skillType}
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-amber-400 text-amber-950 flex flex-col items-center justify-center shadow-sm">
                <span className="text-2xl font-extrabold leading-none tabular-nums">
                  {result.ovr}
                </span>
                <span className="text-[10px] font-extrabold">OVR</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
              {statDefs.map((st) => (
                <div
                  key={st.code}
                  className="bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 flex items-center justify-between border border-amber-200 dark:border-slate-700"
                >
                  <span className="font-bold text-slate-500">{st.code}</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {result.ovrAttributes[st.code] ?? result.ovr}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-800 dark:text-slate-200 space-y-1">
              <p>
                <strong>Análise:</strong> {result.videoSummary}
              </p>
              <p className="text-emerald-800 dark:text-emerald-300">
                <strong>Pontos fortes:</strong> {result.strengths}
              </p>
              <p className="text-sky-800 dark:text-sky-300">
                <strong>Dica simples:</strong> {result.improvementTip}
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleConfirmSave}
              className="w-full min-h-[46px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {saving
                  ? 'Salvando na carta do time...'
                  : 'Salvar Over na Carta do Plano de Jogo'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
