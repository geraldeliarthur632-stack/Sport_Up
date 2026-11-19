import React, { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowLeftRight,
  Calendar,
  Camera,
  Check,
  Copy,
  Edit3,
  MapPin,
  MessageCircle,
  Plus,
  Share2,
  Shield,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { SPORTS, SPORTS_BY_ID } from '../data/sportsMeta';
import {
  db,
  handleFirestoreError,
  OperationType,
  uploadMediaToStorage,
} from '../lib/firebase';
import {
  buildWhatsAppUrl,
  formatMatchShareText,
  formatTeamInviteShareText,
  formatTeamLineupShareText,
} from '../lib/shareExport';
import type {
  SportId,
  Team,
  TeamMatch,
  TeamMember,
  UserProfile,
  UserTeamMembershipRef,
} from '../types/sportup';
import { ShareExportModal, type ShareExportPayload } from './ShareExportModal';
import { TeamChat } from './TeamChat';

interface TeamTabProps {
  userProfile: UserProfile;
  onUnlockTeamAchievement: () => Promise<void>;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SP';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const TeamTab: React.FC<TeamTabProps> = ({
  userProfile,
  onUnlockTeamAchievement,
}) => {
  const [memberships, setMemberships] = useState<UserTeamMembershipRef[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(
    userProfile.activeTeamId ?? null
  );
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [matches, setMatches] = useState<TeamMatch[]>([]);
  const [teamSubTab, setTeamSubTab] = useState<'chat' | 'elenco' | 'partidas'>('chat');

  // Create/Join Mode
  const [flowMode, setFlowMode] = useState<'none' | 'create' | 'join'>('none');

  // Create Wizard (Steps 1..5)
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogoFile, setNewTeamLogoFile] = useState<File | null>(null);
  const [newTeamLogoPreview, setNewTeamLogoPreview] = useState('');
  const [newTeamSport, setNewTeamSport] = useState<SportId>('futsal');
  const [generatedCode, setGeneratedCode] = useState(() => generateInviteCode());
  const [creatorRole, setCreatorRole] = useState<'coach' | 'player'>('player');
  const [creatorName, setCreatorName] = useState(userProfile.displayName);
  const [creatorJersey, setCreatorJersey] = useState('10');
  const [creatorPosition, setCreatorPosition] = useState(
    SPORTS_BY_ID.futsal.positions[0].name
  );
  const [creatorStarter, setCreatorStarter] = useState(true);

  // Join Flow
  const [inviteInput, setInviteInput] = useState('');
  const [foundInvite, setFoundInvite] = useState<{
    teamId: string;
    teamName: string;
    sportId: SportId;
    inviteCode: string;
  } | null>(null);
  const [joinRole, setJoinRole] = useState<'coach' | 'player'>('player');
  const [joinName, setJoinName] = useState(userProfile.displayName);
  const [joinJersey, setJoinJersey] = useState('7');
  const [joinPosition, setJoinPosition] = useState('');
  const [joinStarter, setJoinStarter] = useState(true);

  // Roster Edit Modal
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editJersey, setEditJersey] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState<'coach' | 'player'>('player');
  const [editStarter, setEditStarter] = useState(true);

  // Match Form
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [teamScore, setTeamScore] = useState('0');
  const [opponentScore, setOpponentScore] = useState('0');
  const [matchDate, setMatchDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [matchLocation, setMatchLocation] = useState('');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sharePayload, setSharePayload] = useState<ShareExportPayload | null>(null);

  // Listen to user's team memberships
  useEffect(() => {
    const path = `users/${userProfile.uid}/teamMemberships`;
    const qMemberships = query(
      collection(db, path),
      where('userId', '==', userProfile.uid)
    );
    const unsub = onSnapshot(
      qMemberships,
      (snap) => {
        const list = snap.docs.map(
          (d) => d.data() as UserTeamMembershipRef
        );
        setMemberships(list);
        if (!activeTeamId && list.length > 0) {
          setActiveTeamId(list[0].teamId);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, path)
    );
    return () => unsub();
  }, [userProfile.uid, activeTeamId]);

  // Listen to active team, roster, and matches
  useEffect(() => {
    if (!activeTeamId) {
      setTeam(null);
      setMembers([]);
      setMatches([]);
      return;
    }

    const teamPath = `teams/${activeTeamId}`;
    const unsubTeam = onSnapshot(
      doc(db, teamPath),
      (snap) => {
        if (snap.exists()) {
          setTeam(snap.data() as Team);
        } else {
          setTeam(null);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, teamPath)
    );

    const membersPath = `teams/${activeTeamId}/members`;
    const unsubMembers = onSnapshot(
      collection(db, membersPath),
      (snap) => {
        setMembers(snap.docs.map((d) => d.data() as TeamMember));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, membersPath)
    );

    const matchesPath = `teams/${activeTeamId}/matches`;
    const unsubMatches = onSnapshot(
      query(collection(db, matchesPath), orderBy('createdAt', 'desc')),
      (snap) => {
        setMatches(snap.docs.map((d) => d.data() as TeamMatch));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, matchesPath)
    );

    return () => {
      unsubTeam();
      unsubMembers();
      unsubMatches();
    };
  }, [activeTeamId]);

  const currentMember = members.find((m) => m.uid === userProfile.uid);
  const canManageRoster =
    team?.ownerId === userProfile.uid || currentMember?.role === 'coach';

  const handleFinishCreateTeam = async () => {
    setBusy(true);
    setErrorMsg(null);
    const teamId = `team_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cleanCode = generatedCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

    try {
      let logoURL = '';
      if (newTeamLogoFile) {
        try {
          logoURL = await uploadMediaToStorage(
            `teams/${teamId}/logo_${Date.now()}`,
            newTeamLogoFile
          );
        } catch {
          logoURL = '';
        }
      }

      const teamPayload: Record<string, unknown> = {
        id: teamId,
        name: newTeamName.trim(),
        sportId: newTeamSport,
        inviteCode: cleanCode,
        ownerId: userProfile.uid,
        wins: 0,
        draws: 0,
        losses: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (logoURL) teamPayload.logoURL = logoURL;
      if (creatorRole === 'coach') teamPayload.coachId = userProfile.uid;

      await setDoc(doc(db, 'teams', teamId), teamPayload);

      await setDoc(doc(db, 'teamInvites', cleanCode), {
        inviteCode: cleanCode,
        teamId,
        teamName: newTeamName.trim(),
        sportId: newTeamSport,
        ownerId: userProfile.uid,
        createdAt: serverTimestamp(),
      });

      const memberPayload: Record<string, unknown> = {
        uid: userProfile.uid,
        teamId,
        displayName: creatorName.trim() || userProfile.displayName,
        role: creatorRole,
        isStarter: creatorRole === 'coach' ? true : creatorStarter,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (userProfile.photoURL) memberPayload.photoURL = userProfile.photoURL;
      if (creatorRole === 'player') {
        memberPayload.jerseyNumber = creatorJersey.trim() || '10';
        memberPayload.position = creatorPosition;
      }

      await setDoc(
        doc(db, 'teams', teamId, 'members', userProfile.uid),
        memberPayload
      );

      await setDoc(
        doc(db, 'users', userProfile.uid, 'teamMemberships', teamId),
        {
          userId: userProfile.uid,
          teamId,
          teamName: newTeamName.trim(),
          sportId: newTeamSport,
          role: creatorRole,
          joinedAt: serverTimestamp(),
        }
      );

      await updateDoc(doc(db, 'users', userProfile.uid), {
        activeTeamId: teamId,
        updatedAt: serverTimestamp(),
      });

      await onUnlockTeamAchievement();
      setActiveTeamId(teamId);
      setFlowMode('none');
      setCreateStep(1);
      setNewTeamName('');
      setNewTeamLogoFile(null);
      setNewTeamLogoPreview('');
      setGeneratedCode(generateInviteCode());
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao criar o time.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLookupInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const code = inviteInput.trim().toUpperCase();
    if (code.length < 6) {
      setErrorMsg('Digite o código de convite completo (ex: SP8K2M).');
      return;
    }
    setBusy(true);
    try {
      const snap = await getDoc(doc(db, 'teamInvites', code));
      if (!snap.exists()) {
        setErrorMsg('Código de convite não encontrado. Verifique com o seu time.');
        return;
      }
      const data = snap.data() as {
        teamId: string;
        teamName: string;
        sportId: SportId;
        inviteCode: string;
      };
      setFoundInvite(data);
      setJoinPosition(SPORTS_BY_ID[data.sportId].positions[0].name);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `teamInvites/${code}`);
    } finally {
      setBusy(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundInvite) return;
    setBusy(true);
    setErrorMsg(null);

    try {
      const memberPayload: Record<string, unknown> = {
        uid: userProfile.uid,
        teamId: foundInvite.teamId,
        displayName: joinName.trim() || userProfile.displayName,
        role: joinRole,
        isStarter: joinRole === 'coach' ? true : joinStarter,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (userProfile.photoURL) memberPayload.photoURL = userProfile.photoURL;
      if (joinRole === 'player') {
        memberPayload.jerseyNumber = joinJersey.trim() || '7';
        memberPayload.position = joinPosition;
      }

      await setDoc(
        doc(db, 'teams', foundInvite.teamId, 'members', userProfile.uid),
        memberPayload
      );

      await setDoc(
        doc(db, 'users', userProfile.uid, 'teamMemberships', foundInvite.teamId),
        {
          userId: userProfile.uid,
          teamId: foundInvite.teamId,
          teamName: foundInvite.teamName,
          sportId: foundInvite.sportId,
          role: joinRole,
          joinedAt: serverTimestamp(),
        }
      );

      await updateDoc(doc(db, 'users', userProfile.uid), {
        activeTeamId: foundInvite.teamId,
        updatedAt: serverTimestamp(),
      });

      await onUnlockTeamAchievement();
      setActiveTeamId(foundInvite.teamId);
      setFlowMode('none');
      setFoundInvite(null);
      setInviteInput('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao entrar no time.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !editingMember) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        role: editRole,
        isStarter: editRole === 'coach' ? true : editStarter,
        updatedAt: serverTimestamp(),
      };
      if (editRole === 'player') {
        payload.jerseyNumber = editJersey.trim() || '1';
        payload.position = editPosition;
      }
      await updateDoc(
        doc(db, 'teams', team.id, 'members', editingMember.uid),
        payload
      );
      setEditingMember(null);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `teams/${team.id}/members/${editingMember.uid}`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStarter = async (member: TeamMember) => {
    if (!team || member.role !== 'player') return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'teams', team.id, 'members', member.uid), {
        isStarter: !member.isStarter,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `teams/${team.id}/members/${member.uid}`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!team || member.uid === team.ownerId) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'teams', team.id, 'members', member.uid));
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `teams/${team.id}/members/${member.uid}`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRecordMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !currentMember || !opponent.trim()) return;
    setBusy(true);

    const tScore = Math.max(0, Number(teamScore) || 0);
    const oScore = Math.max(0, Number(opponentScore) || 0);
    const outcome: 'win' | 'draw' | 'loss' =
      tScore > oScore ? 'win' : tScore === oScore ? 'draw' : 'loss';
    const matchId = `match_${Date.now()}`;

    try {
      const matchPayload: Record<string, unknown> = {
        id: matchId,
        teamId: team.id,
        opponent: opponent.trim(),
        teamScore: tScore,
        opponentScore: oScore,
        outcome,
        matchDate,
        createdBy: userProfile.uid,
        createdByName: currentMember.displayName,
        createdAt: serverTimestamp(),
      };
      if (matchLocation.trim()) matchPayload.location = matchLocation.trim();

      await setDoc(doc(db, 'teams', team.id, 'matches', matchId), matchPayload);

      // Update team W/D/L counters
      const statField =
        outcome === 'win' ? 'wins' : outcome === 'draw' ? 'draws' : 'losses';
      await updateDoc(doc(db, 'teams', team.id), {
        [statField]: increment(1),
        updatedAt: serverTimestamp(),
      });

      // Automatically post a match card in the Team Chat
      const chatMsgId = `msg_${Date.now()}_match`;
      const chatMsgPayload: Record<string, unknown> = {
        id: chatMsgId,
        teamId: team.id,
        senderId: userProfile.uid,
        senderName: currentMember.displayName,
        senderRole: currentMember.role,
        type: 'match_card',
        matchCardData: {
          matchId,
          opponent: opponent.trim(),
          teamScore: tScore,
          opponentScore: oScore,
          outcome,
          matchDate,
          location: matchLocation.trim() || '',
        },
        deliveryStatus: 'delivered',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(
        doc(db, 'teams', team.id, 'messages', chatMsgId),
        chatMsgPayload
      );

      setOpponent('');
      setTeamScore('0');
      setOpponentScore('0');
      setMatchLocation('');
      setShowMatchForm(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `teams/${team.id}/matches/${matchId}`
      );
    } finally {
      setBusy(false);
    }
  };

  const copyCode = () => {
    if (!team) return;
    navigator.clipboard.writeText(team.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Show Create or Join Modal/View if triggered or if user has no team
  if (flowMode === 'create') {
    const selectedSportMeta = SPORTS_BY_ID[newTeamSport];
    return (
      <div className="max-w-lg mx-auto bg-white border-2 border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-700">
              Passo {createStep} de 5
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">
              Criar novo time
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setFlowMode('none');
              setCreateStep(1);
            }}
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
            {errorMsg}
          </div>
        )}

        {createStep === 1 && (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-800">
              1. Qual é o nome do seu time?
            </label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Ex: Atlética Relâmpago FC"
              className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none text-sm font-semibold"
            />
            <button
              type="button"
              disabled={newTeamName.trim().length < 2}
              onClick={() => setCreateStep(2)}
              className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm border-b-4 border-emerald-700"
            >
              Continuar
            </button>
          </div>
        )}

        {createStep === 2 && (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-800">
              2. Logo do time (opcional)
            </label>
            <div className="flex items-center gap-4">
              <label className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-emerald-500">
                {newTeamLogoPreview ? (
                  <img
                    src={newTeamLogoPreview}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-7 h-7 text-slate-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setNewTeamLogoFile(f);
                      setNewTeamLogoPreview(URL.createObjectURL(f));
                    }
                  }}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 flex-1">
                Você pode enviar um escudo agora ou pular esta etapa e deixar sem logo.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreateStep(1)}
                className="min-h-[48px] px-4 rounded-2xl border-2 border-slate-200 font-bold text-sm text-slate-600"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setCreateStep(3)}
                className="flex-1 min-h-[48px] rounded-2xl bg-emerald-500 text-white font-extrabold text-sm border-b-4 border-emerald-700"
              >
                {newTeamLogoFile ? 'Continuar' : 'Continuar sem logo'}
              </button>
            </div>
          </div>
        )}

        {createStep === 3 && (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-800">
              3. Selecione o esporte do time
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {SPORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setNewTeamSport(s.id);
                    setCreatorPosition(s.positions[0].name);
                  }}
                  className={`min-h-[48px] px-3 py-2.5 rounded-2xl border-2 border-b-4 font-bold text-sm transition ${
                    newTeamSport === s.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreateStep(2)}
                className="min-h-[48px] px-4 rounded-2xl border-2 border-slate-200 font-bold text-sm text-slate-600"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setCreateStep(4)}
                className="flex-1 min-h-[48px] rounded-2xl bg-emerald-500 text-white font-extrabold text-sm border-b-4 border-emerald-700"
              >
                Gerar código de convite
              </button>
            </div>
          </div>
        )}

        {createStep === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-800">
              4. Código único de convite gerado!
            </p>
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 text-center space-y-2.5">
              <p className="text-xs font-bold text-emerald-700">
                Compartilhe este código com seu elenco
              </p>
              <p className="text-3xl font-extrabold tracking-widest text-slate-900 tabular-nums">
                {generatedCode}
              </p>
              <a
                href={buildWhatsAppUrl(
                  formatTeamInviteShareText({
                    teamName: newTeamName.trim() || 'Meu Time',
                    sportName: selectedSportMeta.name,
                    inviteCode: generatedCode,
                  })
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs border-b-2 border-[#15803D]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Enviar código no WhatsApp</span>
              </a>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreateStep(3)}
                className="min-h-[48px] px-4 rounded-2xl border-2 border-slate-200 font-bold text-sm text-slate-600"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setCreateStep(5)}
                className="flex-1 min-h-[48px] rounded-2xl bg-emerald-500 text-white font-extrabold text-sm border-b-4 border-emerald-700"
              >
                Escolher meu papel
              </button>
            </div>
          </div>
        )}

        {createStep === 5 && (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-800">
              5. Qual é o seu papel no time? (técnico é opcional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreatorRole('player')}
                className={`min-h-[46px] rounded-2xl border-2 font-bold text-sm ${
                  creatorRole === 'player'
                    ? 'bg-sky-50 border-sky-500 text-sky-900'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                Jogador
              </button>
              <button
                type="button"
                onClick={() => setCreatorRole('coach')}
                className={`min-h-[46px] rounded-2xl border-2 font-bold text-sm ${
                  creatorRole === 'coach'
                    ? 'bg-sky-50 border-sky-500 text-sky-900'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                Técnico
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Seu nome no elenco
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm font-medium"
              />
            </div>

            {creatorRole === 'player' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Camisa
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={creatorJersey}
                      onChange={(e) => setCreatorJersey(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm font-bold tabular-nums"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Posição ({selectedSportMeta.name})
                    </label>
                    <select
                      value={creatorPosition}
                      onChange={(e) => setCreatorPosition(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm font-medium bg-white"
                    >
                      {selectedSportMeta.positions.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={creatorStarter}
                    onChange={(e) => setCreatorStarter(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>Sou titular (desmarque se for reserva)</span>
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreateStep(4)}
                className="min-h-[48px] px-4 rounded-2xl border-2 border-slate-200 font-bold text-sm text-slate-600"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleFinishCreateTeam}
                className="flex-1 min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700"
              >
                {busy ? 'Criando time...' : 'Finalizar criação'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (flowMode === 'join') {
    const targetSport = foundInvite
      ? SPORTS_BY_ID[foundInvite.sportId]
      : null;

    return (
      <div className="max-w-lg mx-auto bg-white border-2 border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">
            Entrar em um time
          </h2>
          <button
            type="button"
            onClick={() => {
              setFlowMode('none');
              setFoundInvite(null);
            }}
            className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
            {errorMsg}
          </div>
        )}

        {!foundInvite ? (
          <form onSubmit={handleLookupInvite} className="space-y-4">
            <label className="block text-sm font-bold text-slate-800">
              Digite o código de convite do time
            </label>
            <input
              type="text"
              required
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
              placeholder="Ex: SP8K2M"
              className="w-full min-h-[48px] px-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 outline-none text-base font-extrabold tracking-widest uppercase"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[48px] rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm border-b-4 border-sky-700"
            >
              {busy ? 'Buscando...' : 'Buscar time'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinTeam} className="space-y-4">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-emerald-700">
                Time encontrado · {targetSport?.name}
              </p>
              <p className="text-lg font-extrabold text-slate-900">
                {foundInvite.teamName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setJoinRole('player')}
                className={`min-h-[44px] rounded-2xl border-2 font-bold text-sm ${
                  joinRole === 'player'
                    ? 'bg-sky-50 border-sky-500 text-sky-900'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                Jogador
              </button>
              <button
                type="button"
                onClick={() => setJoinRole('coach')}
                className={`min-h-[44px] rounded-2xl border-2 font-bold text-sm ${
                  joinRole === 'coach'
                    ? 'bg-sky-50 border-sky-500 text-sky-900'
                    : 'border-slate-200 text-slate-700'
                }`}
              >
                Técnico
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Seu nome
              </label>
              <input
                type="text"
                required
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm font-medium"
              />
            </div>

            {joinRole === 'player' && targetSport && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Camisa
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={joinJersey}
                      onChange={(e) => setJoinJersey(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm font-bold tabular-nums"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Posição ({targetSport.name})
                    </label>
                    <select
                      value={joinPosition}
                      onChange={(e) => setJoinPosition(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm font-medium bg-white"
                    >
                      {targetSport.positions.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={joinStarter}
                    onChange={(e) => setJoinStarter(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>Titular (desmarque se for reserva)</span>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700"
            >
              {busy ? 'Entrando...' : 'Entrar no time'}
            </button>
          </form>
        )}
      </div>
    );
  }

  // Empty state when user has no team yet
  if (!team) {
    return (
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Meu Time</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Monte seu elenco, converse no chat igual ao WhatsApp e registre suas partidas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFlowMode('create')}
            className="bg-white border-2 border-emerald-300 border-b-4 rounded-3xl p-6 text-left space-y-3 hover:bg-emerald-50/40 transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Criar time
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Defina nome, logo opcional, esporte e gere um código para convidar seus amigos.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFlowMode('join')}
            className="bg-white border-2 border-sky-300 border-b-4 rounded-3xl p-6 text-left space-y-3 hover:bg-sky-50/40 transition"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Entrar em um time
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Tem um código de convite? Entre como jogador ou técnico agora mesmo.
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const teamSport = SPORTS_BY_ID[team.sportId];

  return (
    <div className="space-y-5 pb-8">
      {/* Team Switcher + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {memberships.map((m) => (
            <button
              key={m.teamId}
              type="button"
              onClick={() => setActiveTeamId(m.teamId)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border-2 whitespace-nowrap ${
                m.teamId === team.id
                  ? 'bg-emerald-500 border-emerald-700 text-white'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              {m.teamName}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFlowMode('create')}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border-2 border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar</span>
          </button>
          <button
            type="button"
            onClick={() => setFlowMode('join')}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border-2 border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
        </div>
      </div>

      {/* Team Header Card */}
      <section className="bg-white border-2 border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          {team.logoURL ? (
            <img
              src={team.logoURL}
              alt={team.name}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Shield className="w-7 h-7" />
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-emerald-700">
              {teamSport.name} · {members.length} membro(s)
            </p>
            <h1 className="text-xl font-extrabold text-slate-900">
              {team.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center justify-center gap-2 tabular-nums"
          >
            <span>Convite: {team.inviteCode}</span>
            {copiedCode ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setSharePayload({
                title: `Convite · ${team.name}`,
                fileName: `convite-${team.inviteCode}.txt`,
                text: formatTeamInviteShareText({
                  teamName: team.name,
                  sportName: teamSport.name,
                  inviteCode: team.inviteCode,
                }),
              })
            }
            className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-extrabold border-b-2 border-[#15803D] flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp / Exportar</span>
          </button>
        </div>
      </section>

      {/* Sub-navigation: Chat | Elenco | Partidas */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
        <button
          type="button"
          onClick={() => setTeamSubTab('chat')}
          className={`min-h-[42px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
            teamSubTab === 'chat'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat</span>
        </button>
        <button
          type="button"
          onClick={() => setTeamSubTab('elenco')}
          className={`min-h-[42px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
            teamSubTab === 'elenco'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Escalação</span>
        </button>
        <button
          type="button"
          onClick={() => setTeamSubTab('partidas')}
          className={`min-h-[42px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
            teamSubTab === 'partidas'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Partidas</span>
        </button>
      </div>

      {/* Chat Sub-tab */}
      {teamSubTab === 'chat' && currentMember && (
        <TeamChat
          team={team}
          currentMember={currentMember}
          currentUserId={userProfile.uid}
        />
      )}

      {/* Escalação (Titulares & Reservas) Sub-tab */}
      {teamSubTab === 'elenco' && (() => {
        const starters = members.filter((m) => m.role === 'player' && m.isStarter);
        const reserves = members.filter((m) => m.role === 'player' && !m.isStarter);
        const coaches = members.filter((m) => m.role === 'coach');

        const courtBg =
          team.sportId === 'futebol'
            ? 'bg-emerald-700'
            : team.sportId === 'futsal'
              ? 'bg-sky-600'
              : team.sportId === 'volei'
                ? 'bg-orange-500'
                : team.sportId === 'basquete'
                  ? 'bg-amber-600'
                  : 'bg-blue-700';

        // Group starters by position so multiple players at the same position stagger cleanly
        const posGroupCounts: Record<string, number> = {};
        const posGroupSeen: Record<string, number> = {};
        starters.forEach((s) => {
          const key = s.position || teamSport.positions[0].name;
          posGroupCounts[key] = (posGroupCounts[key] || 0) + 1;
        });

        const renderPlayerRow = (m: TeamMember, isStarterList: boolean) => {
          const canToggle = canManageRoster || m.uid === userProfile.uid;
          return (
            <div
              key={m.uid}
              className={`rounded-2xl p-3.5 flex items-center justify-between gap-3 border-2 ${
                isStarterList
                  ? 'bg-white border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {m.photoURL ? (
                  <img
                    src={m.photoURL}
                    alt={m.displayName}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200"
                  />
                ) : (
                  <div
                    className={`w-11 h-11 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums ${
                      isStarterList
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    #{m.jerseyNumber || '0'}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 truncate">
                    {m.displayName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.position || 'Jogador'} · Camisa {m.jerseyNumber || '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canToggle && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleToggleStarter(m)}
                    title={
                      isStarterList
                        ? 'Mover para os reservas'
                        : 'Colocar nos titulares'
                    }
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 whitespace-nowrap transition ${
                      isStarterList
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>{isStarterList ? 'Ir p/ reserva' : 'Virar titular'}</span>
                  </button>
                )}

                {canManageRoster && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(m);
                        setEditRole(m.role);
                        setEditJersey(m.jerseyNumber || '10');
                        setEditPosition(
                          m.position || teamSport.positions[0].name
                        );
                        setEditStarter(m.isStarter);
                      }}
                      title="Editar membro"
                      className="min-w-[38px] min-h-[38px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {m.uid !== team.ownerId && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m)}
                        title="Remover membro"
                        className="min-w-[38px] min-h-[38px] rounded-xl text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        };

        return (
          <section className="space-y-6">
            {/* Tactical Starting Lineup Board */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Escalação em {team.sportId === 'futebol' ? 'Campo' : team.sportId === 'pingpong' ? 'Mesa' : 'Quadra'}
                  </h2>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {starters.length} titular(es) · {reserves.length} reserva(s) ·{' '}
                    {coaches.length > 0 ? `${coaches.length} técnico` : 'Sem técnico'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSharePayload({
                      title: `Escalação · ${team.name}`,
                      fileName: `escalacao-${team.inviteCode}.txt`,
                      text: formatTeamLineupShareText({
                        teamName: team.name,
                        sportName: teamSport.name,
                        inviteCode: team.inviteCode,
                        starters,
                        reserves,
                        coaches,
                      }),
                    })
                  }
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Exportar escalação</span>
                </button>
              </div>

              <div
                className={`relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl ${courtBg} border-2 border-slate-200 overflow-hidden select-none shadow-inner`}
              >
                <svg
                  viewBox="0 0 100 56"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <rect
                    x="3"
                    y="3"
                    width="94"
                    height="50"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="0.7"
                    opacity="0.85"
                  />
                  <line
                    x1="50"
                    y1="3"
                    x2="50"
                    y2="53"
                    stroke="#FFFFFF"
                    strokeWidth="0.7"
                    opacity="0.85"
                  />
                  <circle
                    cx="50"
                    cy="28"
                    r="8"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="0.6"
                    opacity="0.75"
                  />
                  <rect
                    x="3"
                    y="15"
                    width="14"
                    height="26"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="0.6"
                    opacity="0.75"
                  />
                  <rect
                    x="83"
                    y="15"
                    width="14"
                    height="26"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="0.6"
                    opacity="0.75"
                  />
                </svg>

                {starters.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <p className="text-xs font-bold text-white/95 bg-slate-900/45 px-4 py-2 rounded-xl text-center">
                      Nenhum titular escalado ainda. Marque jogadores como titulares abaixo.
                    </p>
                  </div>
                )}

                {starters.map((player) => {
                  const posKey = player.position || teamSport.positions[0].name;
                  const metaPos =
                    teamSport.positions.find((p) => p.name === posKey) ||
                    teamSport.positions[0];
                  const countInPos = posGroupCounts[posKey] || 1;
                  const seenIdx = posGroupSeen[posKey] || 0;
                  posGroupSeen[posKey] = seenIdx + 1;

                  const yOffset =
                    countInPos > 1
                      ? (seenIdx - (countInPos - 1) / 2) * 16
                      : 0;
                  const clampedY = Math.max(14, Math.min(86, metaPos.zoneY + yOffset));
                  const clampedX = Math.max(10, Math.min(90, metaPos.zoneX));
                  const firstName = player.displayName.split(' ')[0];

                  return (
                    <div
                      key={player.uid}
                      style={{ left: `${clampedX}%`, top: `${clampedY}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 pointer-events-none"
                    >
                      <div className="w-9 h-9 rounded-full bg-white border-2 border-slate-900 text-slate-900 font-extrabold text-xs flex items-center justify-center shadow-md tabular-nums">
                        #{player.jerseyNumber || '0'}
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950/75 text-white text-[10px] font-bold whitespace-nowrap leading-tight">
                        {firstName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Titulares */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Escalação dos Titulares
                </h3>
                <span className="text-xs font-bold text-emerald-700 tabular-nums">
                  {starters.length} escalado(s)
                </span>
              </div>
              {starters.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
                  Nenhum jogador titular no momento.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {starters.map((m) => renderPlayerRow(m, true))}
                </div>
              )}
            </div>

            {/* Banco de Reservas */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Banco de Reservas
                </h3>
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  {reserves.length} reserva(s)
                </span>
              </div>
              {reserves.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500">
                  Nenhum jogador no banco de reservas.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reserves.map((m) => renderPlayerRow(m, false))}
                </div>
              )}
            </div>

            {/* Comissão Técnica (opcional) */}
            {coaches.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Comissão Técnica
                  </h3>
                  <span className="text-xs font-bold text-sky-700 tabular-nums">
                    {coaches.length} técnico(s)
                  </span>
                </div>
                <div className="space-y-2.5">
                  {coaches.map((m) => (
                    <div
                      key={m.uid}
                      className="bg-sky-50/70 border-2 border-sky-200 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {m.photoURL ? (
                          <img
                            src={m.photoURL}
                            alt={m.displayName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover shrink-0 border border-sky-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                            TEC
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 truncate">
                            {m.displayName}
                          </p>
                          <p className="text-xs text-sky-800">Técnico</p>
                        </div>
                      </div>

                      {canManageRoster && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMember(m);
                              setEditRole(m.role);
                              setEditJersey(m.jerseyNumber || '10');
                              setEditPosition(
                                m.position || teamSport.positions[0].name
                              );
                              setEditStarter(m.isStarter);
                            }}
                            title="Editar membro"
                            className="min-w-[38px] min-h-[38px] rounded-xl text-slate-500 hover:bg-white flex items-center justify-center"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {m.uid !== team.ownerId && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m)}
                              title="Remover membro"
                              className="min-w-[38px] min-h-[38px] rounded-xl text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMemberEdit}
            className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Editar {editingMember.displayName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditRole('player')}
                className={`min-h-[42px] rounded-xl border-2 text-xs font-bold ${
                  editRole === 'player'
                    ? 'bg-sky-50 border-sky-500 text-sky-900'
                    : 'border-slate-200'
                }`}
              >
                Jogador
              </button>
              <button
                type="button"
                onClick={() => setEditRole('coach')}
                className={`min-h-[42px] rounded-xl border-2 text-xs font-bold ${
                  editRole === 'coach'
                    ? 'bg-sky-50 border-sky-500 text-sky-900'
                    : 'border-slate-200'
                }`}
              >
                Técnico
              </button>
            </div>

            {editRole === 'player' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Camisa
                    </label>
                    <input
                      type="text"
                      value={editJersey}
                      onChange={(e) => setEditJersey(e.target.value)}
                      className="w-full min-h-[42px] px-3 rounded-xl border-2 border-slate-200 text-sm font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Posição
                    </label>
                    <select
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      className="w-full min-h-[42px] px-2 rounded-xl border-2 border-slate-200 text-sm bg-white"
                    >
                      {teamSport.positions.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editStarter}
                    onChange={(e) => setEditStarter(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>Titular</span>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[46px] rounded-2xl bg-emerald-500 text-white font-extrabold text-sm border-b-4 border-emerald-700"
            >
              Salvar alterações
            </button>
          </form>
        </div>
      )}

      {/* Partidas Sub-tab */}
      {teamSubTab === 'partidas' && (
        <section className="space-y-4">
          {/* W / D / L Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 text-center">
              <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                {team.wins}
              </p>
              <p className="text-xs font-bold text-emerald-900">Vitórias</p>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 text-center">
              <p className="text-2xl font-extrabold text-amber-700 tabular-nums">
                {team.draws}
              </p>
              <p className="text-xs font-bold text-amber-900">Empates</p>
            </div>
            <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3 text-center">
              <p className="text-2xl font-extrabold text-rose-700 tabular-nums">
                {team.losses}
              </p>
              <p className="text-xs font-bold text-rose-900">Derrotas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMatchForm((v) => !v)}
            className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700 flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar nova partida</span>
          </button>

          {showMatchForm && (
            <form
              onSubmit={handleRecordMatch}
              className="bg-white border-2 border-slate-200 rounded-3xl p-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nome do adversário
                </label>
                <input
                  type="text"
                  required
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  placeholder="Ex: União Futsal"
                  className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Placar {team.name}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={teamScore}
                    onChange={(e) => setTeamScore(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-base font-extrabold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Placar Adversário
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={opponentScore}
                    onChange={(e) => setOpponentScore(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-base font-extrabold tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Local (opcional)
                  </label>
                  <input
                    type="text"
                    value={matchLocation}
                    onChange={(e) => setMatchLocation(e.target.value)}
                    placeholder="Ex: Ginásio Municipal"
                    className="w-full min-h-[44px] px-3 rounded-2xl border-2 border-slate-200 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[46px] rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm border-b-4 border-sky-700"
              >
                {busy ? 'Salvando...' : 'Salvar e publicar no chat'}
              </button>
            </form>
          )}

          {/* Match History */}
          <div className="space-y-2.5">
            {matches.length === 0 && (
              <p className="text-center text-xs text-slate-500 py-6">
                Nenhuma partida registrada ainda.
              </p>
            )}
            {matches.map((mt) => {
              const badge =
                mt.outcome === 'win'
                  ? 'Vitória'
                  : mt.outcome === 'draw'
                    ? 'Empate'
                    : 'Derrota';
              const badgeCls =
                mt.outcome === 'win'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : mt.outcome === 'draw'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-rose-700 bg-rose-50 border-rose-200';

              return (
                <div
                  key={mt.id}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      {mt.matchDate}
                      {mt.location && (
                        <>
                          <span>·</span>
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{mt.location}</span>
                        </>
                      )}
                    </span>
                    <span
                      className={`font-extrabold px-2.5 py-0.5 rounded-lg border ${badgeCls}`}
                    >
                      {badge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-base font-extrabold text-slate-900 tabular-nums">
                    <span>{team.name}</span>
                    <span className="text-lg">
                      {mt.teamScore} x {mt.opponentScore}
                    </span>
                    <span>{mt.opponent}</span>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setSharePayload({
                          title: `Placar · ${team.name} x ${mt.opponent}`,
                          fileName: `partida-${mt.matchDate}.txt`,
                          text: formatMatchShareText({
                            teamName: team.name,
                            sportName: teamSport.name,
                            match: mt,
                          }),
                        })
                      }
                      className="min-h-[34px] px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Exportar / WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sharePayload && (
        <ShareExportModal
          payload={sharePayload}
          onClose={() => setSharePayload(null)}
        />
      )}
    </div>
  );
};
