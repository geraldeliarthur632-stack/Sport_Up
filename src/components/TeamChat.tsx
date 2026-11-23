import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Bell,
  CheckCheck,
  ClipboardList,
  Dumbbell,
  Eye,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Reply,
  Send,
  Square,
  Trophy,
  Video,
  X,
} from 'lucide-react';
import {
  db,
  handleFirestoreError,
  OperationType,
  uploadMediaToStorage,
} from '../lib/firebase';
import {
  buildWhatsAppUrl,
  formatChatMatchCardShareText,
} from '../lib/shareExport';
import type { Team, TeamMember, TeamMessage } from '../types/sportup';
import { PWAChatSemiBanner } from './PWAInstallBanner';

interface TeamChatProps {
  team: Team;
  currentMember: TeamMember;
  currentUserId: string;
}

export const TeamChat: React.FC<TeamChatProps> = ({
  team,
  currentMember,
  currentUserId,
}) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCardDetails = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    const path = `teams/${team.id}/messages`;
    const q = query(collection(db, path), orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: TeamMessage[] = snap.docs.map((d) => ({
          ...(d.data() as TeamMessage),
          id: d.id,
        }));
        setMessages(list);

        // Mark unread messages from teammates as 'read'
        list.forEach((m) => {
          if (m.senderId !== currentUserId && m.deliveryStatus === 'delivered') {
            updateDoc(doc(db, path, m.id), {
              deliveryStatus: 'read',
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
        });

        // Push notification on incoming message
        if (
          prevCountRef.current > 0 &&
          list.length > prevCountRef.current
        ) {
          const last = list[list.length - 1];
          if (
            last &&
            last.senderId !== currentUserId &&
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted' &&
            document.hidden
          ) {
            new Notification(`${team.name} · ${last.senderName}`, {
              body: last.text || 'Enviou uma mídia no chat do time',
              icon: '/icon.svg',
            });
          }
        }
        prevCountRef.current = list.length;
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => unsub();
  }, [team.id, team.name, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === 'granted');
  };

  const sendMessageDoc = async (payload: {
    type: TeamMessage['type'];
    text?: string;
    mediaURL?: string;
    fileName?: string;
  }) => {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const path = `teams/${team.id}/messages`;
    const docData: Record<string, unknown> = {
      id: msgId,
      teamId: team.id,
      senderId: currentUserId,
      senderName: currentMember.displayName,
      senderRole: currentMember.role,
      type: payload.type,
      deliveryStatus: 'delivered',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (currentMember.position) {
      docData.senderPosition = currentMember.position;
    }
    if (currentMember.jerseyNumber) {
      docData.senderJersey = currentMember.jerseyNumber;
    }
    if (payload.text) {
      docData.text = payload.text.slice(0, 2000);
    }
    if (payload.mediaURL) {
      docData.mediaURL = payload.mediaURL;
    }
    if (payload.fileName) {
      docData.fileName = payload.fileName.slice(0, 180);
    }
    if (replyTo) {
      docData.replyToId = replyTo.id;
      docData.replyToSender = replyTo.senderName;
      docData.replyToPreview = (
        replyTo.text ||
        replyTo.fileName ||
        (replyTo.type === 'match_card'
          ? 'Cartão de partida'
          : replyTo.type === 'game_plan_card'
            ? 'Plano de jogo'
            : 'Mídia')
      ).slice(0, 200);
    }

    try {
      await setDoc(doc(db, path, msgId), docData);
      setReplyTo(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${path}/${msgId}`);
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setUploadError(null);
    try {
      await sendMessageDoc({ type: 'text', text: text.trim() });
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'image' | 'video' | 'file'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSending(true);
    setUploadError(null);

    try {
      const storagePath = `teams/${team.id}/chat/${Date.now()}_${file.name}`;
      const url = await uploadMediaToStorage(storagePath, file);
      await sendMessageDoc({
        type: kind,
        mediaURL: url,
        fileName: file.name,
        text: kind === 'file' ? `Arquivo: ${file.name}` : undefined,
      });
    } catch (err) {
      console.error(err);
      setUploadError(
        'Não foi possível enviar o arquivo ao Firebase Storage. Verifique se o Firebase Storage está habilitado no console.'
      );
    } finally {
      setSending(false);
    }
  };

  const toggleRecording = async () => {
    setUploadError(null);
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setSending(true);
        try {
          const url = await uploadMediaToStorage(
            `teams/${team.id}/audio/${Date.now()}.webm`,
            blob
          );
          await sendMessageDoc({
            type: 'audio',
            mediaURL: url,
            fileName: 'Mensagem de voz',
          });
        } catch {
          setUploadError(
            'Áudio gravado, mas o Firebase Storage precisa estar ativado no console para armazenar arquivos de áudio.'
          );
        } finally {
          setSending(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setUploadError('Permissão de microfone negada ou indisponível neste dispositivo.');
    }
  };

  const formatTime = (createdAt: unknown): string => {
    if (!createdAt) return 'agora';
    const ts = createdAt as { toDate?: () => Date };
    const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date();
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-[#ECE5DD] border-2 border-slate-200 rounded-3xl overflow-hidden flex flex-col h-[540px] shadow-sm">
      {/* Chat Header */}
      <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div>
          <p className="text-sm font-extrabold">{team.name} · Chat do Time</p>
          <p className="text-[11px] text-emerald-100">
            Mensagens em tempo real para o elenco
          </p>
        </div>

        {!notifEnabled && typeof Notification !== 'undefined' && (
          <button
            type="button"
            onClick={requestPushPermission}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Ativar alertas</span>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="inline-block bg-white/90 text-slate-600 text-xs font-semibold px-4 py-2 rounded-xl shadow-sm">
              Nenhuma mensagem ainda. Mande um oi para o time!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const headerMeta =
            msg.senderRole === 'coach'
              ? `Técnico · ${msg.senderName}`
              : `${msg.senderPosition || 'Jogador'}${
                  msg.senderJersey ? ` #${msg.senderJersey}` : ''
                } · ${msg.senderName}`;

          if (msg.type === 'game_plan_card' && msg.gamePlanCardData) {
            const gp = msg.gamePlanCardData;
            const isExpanded = Boolean(expandedCards[msg.id]);

            return (
              <div key={msg.id} className="flex justify-center">
                <div className="w-full max-w-sm bg-white border-2 border-sky-300 rounded-2xl p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-sky-800 flex items-center gap-1">
                      <ClipboardList className="w-3.5 h-3.5 text-sky-600" />
                      Plano de Jogo {gp.aiSuggested ? '· IA' : ''}
                    </span>
                    <span className="font-bold text-slate-500 text-[11px]">
                      {gp.formation}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {gp.title}
                    </p>
                    {gp.opponent && (
                      <p className="text-[11px] font-bold text-slate-500">
                        Adversário: {gp.opponent}
                      </p>
                    )}
                  </div>

                  <p className={`text-xs text-slate-700 leading-relaxed whitespace-pre-line ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {gp.tactics}
                  </p>

                  {gp.trainings && gp.trainings.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 space-y-1">
                      <p className="text-[11px] font-extrabold text-emerald-800 flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />
                        <span>Treinos selecionados:</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {gp.trainings.map((tr) => (
                          <span
                            key={tr}
                            className="px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-[10px] font-bold text-emerald-900"
                          >
                            {tr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && gp.starterSummary && (
                    <p className="text-[11px] font-semibold text-slate-600 bg-slate-50 rounded-xl p-2">
                      <strong>Titulares / Overs:</strong> {gp.starterSummary}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">
                      Por {msg.senderName}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCardDetails(msg.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 text-[11px] font-extrabold text-sky-800"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{isExpanded ? 'Ver menos' : 'Ver melhor'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          if (msg.type === 'match_card' && msg.matchCardData) {
            const mc = msg.matchCardData;
            const isExpanded = Boolean(expandedCards[msg.id]);
            const hasExtraStats =
              mc.isLiveMatch ||
              typeof mc.teamFouls === 'number' ||
              typeof mc.yellowCards === 'number' ||
              typeof mc.teamPenalties === 'number';
            const badgeText =
              mc.outcome === 'win'
                ? 'Vitória'
                : mc.outcome === 'draw'
                  ? 'Empate'
                  : 'Derrota';
            const badgeColor =
              mc.outcome === 'win'
                ? 'bg-emerald-100 text-emerald-800'
                : mc.outcome === 'draw'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800';

            return (
              <div key={msg.id} className="flex justify-center">
                <div className="w-full max-w-sm bg-white border-2 border-emerald-200 rounded-2xl p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      {mc.isLiveMatch ? 'Partida Ao Vivo encerrada' : 'Partida registrada'}
                    </span>
                    <span className={`font-extrabold px-2 py-0.5 rounded-lg ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 font-extrabold text-slate-900 tabular-nums">
                    <span className="truncate max-w-[110px]">{team.name}</span>
                    <span className="text-lg">
                      {mc.teamScore} x {mc.opponentScore}
                    </span>
                    <span className="truncate max-w-[110px] text-right">
                      {mc.opponent}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 text-center">
                    {mc.matchDate}
                    {mc.location ? ` · ${mc.location}` : ''} · por {msg.senderName}
                  </p>

                  {isExpanded && hasExtraStats && (
                    <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-700 space-y-1 tabular-nums">
                      <div className="flex justify-between font-bold">
                        <span>Faltas: {mc.teamFouls ?? 0} x {mc.opponentFouls ?? 0}</span>
                        <span>Pênaltis: {mc.teamPenalties ?? 0} x {mc.opponentPenalties ?? 0}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-amber-700">Cartões Amarelos: {mc.yellowCards ?? 0}</span>
                        <span className="text-rose-700">Vermelhos: {mc.redCards ?? 0}</span>
                      </div>
                      {mc.durationMinutes && (
                        <p className="text-slate-500">
                          Duração: {mc.durationMinutes} min · {mc.hasHalftime ? 'Com intervalo' : 'Sem intervalo'}
                        </p>
                      )}
                      {mc.eventsSummary && (
                        <p className="text-slate-600 whitespace-pre-line pt-0.5">
                          {mc.eventsSummary}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                    {hasExtraStats && (
                      <button
                        type="button"
                        onClick={() => toggleCardDetails(msg.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 text-[11px] font-extrabold text-sky-800 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isExpanded ? 'Ver menos' : 'Ver melhor'}</span>
                      </button>
                    )}
                    <a
                      href={buildWhatsAppUrl(
                        formatChatMatchCardShareText({
                          teamName: team.name,
                          opponent: mc.opponent,
                          teamScore: mc.teamScore,
                          opponentScore: mc.opponentScore,
                          outcome: mc.outcome,
                          matchDate: mc.matchDate,
                          location: mc.location,
                        })
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 text-[11px] font-extrabold text-emerald-800 transition"
                    >
                      <span>Compartilhar no WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm space-y-1 ${
                  isMe
                    ? 'bg-[#D9FDD3] text-slate-900 rounded-tr-sm'
                    : 'bg-white text-slate-900 rounded-tl-sm'
                }`}
              >
                {/* Sender position, jersey, name above message */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-extrabold text-emerald-800">
                    {headerMeta}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReplyTo(msg)}
                    title="Responder mensagem"
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quoted reply */}
                {msg.replyToId && (
                  <div className="bg-black/5 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-700">
                    <p className="font-bold text-emerald-800">
                      {msg.replyToSender}
                    </p>
                    <p className="truncate">{msg.replyToPreview}</p>
                  </div>
                )}

                {msg.type === 'image' && msg.mediaURL && (
                  <img
                    src={msg.mediaURL}
                    alt={msg.fileName || 'Foto do time'}
                    className="rounded-xl max-h-56 w-auto object-cover"
                  />
                )}

                {msg.type === 'video' && msg.mediaURL && (
                  <video
                    src={msg.mediaURL}
                    controls
                    className="rounded-xl max-h-56 w-full"
                  />
                )}

                {msg.type === 'audio' && msg.mediaURL && (
                  <audio src={msg.mediaURL} controls className="w-56 h-9" />
                )}

                {msg.type === 'file' && msg.mediaURL && (
                  <a
                    href={msg.mediaURL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-black/5 rounded-xl px-3 py-2 text-xs font-bold text-sky-700 underline"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{msg.fileName || 'Baixar arquivo'}</span>
                  </a>
                )}

                {msg.text && (
                  <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                )}

                {/* Timestamp + delivered/read checkmarks */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 tabular-nums">
                  <span>{formatTime(msg.createdAt)}</span>
                  {isMe && (
                    <CheckCheck
                      className={`w-3.5 h-3.5 ${
                        msg.deliveryStatus === 'read'
                          ? 'text-sky-600'
                          : 'text-slate-400'
                      }`}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Upload error alert */}
      {uploadError && (
        <div className="bg-amber-50 border-t border-amber-200 px-3 py-2 text-xs font-semibold text-amber-900 flex items-center justify-between gap-2">
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reply preview bar */}
      {replyTo && (
        <div className="bg-slate-100 border-t border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="truncate">
            <span className="font-bold text-emerald-700">
              Respondendo a {replyTo.senderName}:{' '}
            </span>
            <span className="text-slate-600">
              {replyTo.text || replyTo.fileName || 'Mídia'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="text-slate-500 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Semi-anúncio de instalação PWA acima da barra de digitação (some ao instalar) */}
      <PWAChatSemiBanner />

      {/* Input Composer */}
      <form
        onSubmit={handleSendText}
        className="bg-white border-t border-slate-200 p-2.5 flex items-center gap-1.5 shrink-0"
      >
        <label
          title="Enviar foto"
          className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <ImageIcon className="w-5 h-5" />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'image')}
            className="hidden"
          />
        </label>

        <label
          title="Enviar vídeo"
          className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <Video className="w-5 h-5" />
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileUpload(e, 'video')}
            className="hidden"
          />
        </label>

        <label
          title="Enviar arquivo"
          className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <Paperclip className="w-5 h-5" />
          <input
            type="file"
            onChange={(e) => handleFileUpload(e, 'file')}
            className="hidden"
          />
        </label>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1 min-w-0 min-h-[42px] px-3.5 rounded-2xl bg-slate-100 focus:bg-white border-2 border-transparent focus:border-emerald-500 outline-none text-sm"
        />

        {text.trim() ? (
          <button
            type="submit"
            disabled={sending}
            aria-label="Enviar mensagem"
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleRecording}
            aria-label={recording ? 'Parar gravação' : 'Gravar áudio'}
            className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center shrink-0 transition ${
              recording
                ? 'bg-rose-500 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {recording ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}
      </form>
    </div>
  );
};
