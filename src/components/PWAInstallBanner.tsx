import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Laptop,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { SportUpLogo } from './SportUpLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type DevicePlatform = 'apple' | 'android' | 'pc';

const INSTALLED_STORAGE_KEY = 'sportup_pwa_installed';
const FLOATING_AD_DISMISSED_KEY = 'sportup_pwa_ad_dismissed_session';
const SYNC_EVENT = 'sportup-pwa-sync';

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalListenersBound = false;

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as unknown as { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true ||
    localStorage.getItem(INSTALLED_STORAGE_KEY) === '1'
  );
}

function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'pc';
  const ua = window.navigator.userAgent.toLowerCase();
  const maxTouch = window.navigator.maxTouchPoints || 0;
  if (/iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && maxTouch > 1)) {
    return 'apple';
  }
  if (/macintosh|mac os x/.test(ua)) {
    return 'apple';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'pc';
}

function notifyPWASync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SYNC_EVENT));
  }
}

function markPWAInstalled() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(INSTALLED_STORAGE_KEY, '1');
    globalDeferredPrompt = null;
    notifyPWASync();
  }
}

function bindGlobalPWAListeners() {
  if (typeof window === 'undefined' || globalListenersBound) return;
  globalListenersBound = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPWASync();
  });

  window.addEventListener('appinstalled', () => {
    markPWAInstalled();
  });

  const media = window.matchMedia('(display-mode: standalone)');
  if (media.addEventListener) {
    media.addEventListener('change', (ev) => {
      if (ev.matches) markPWAInstalled();
    });
  }
}

bindGlobalPWAListeners();

export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone());
  const [hasPrompt, setHasPrompt] = useState<boolean>(() => !!globalDeferredPrompt);
  const [platform] = useState<DevicePlatform>(() => detectDevicePlatform());
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    bindGlobalPWAListeners();
    const sync = () => {
      setIsInstalled(detectStandalone());
      setHasPrompt(!!globalDeferredPrompt);
    };
    sync();
    window.addEventListener(SYNC_EVENT, sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (globalDeferredPrompt) {
      try {
        await globalDeferredPrompt.prompt();
        const { outcome } = await globalDeferredPrompt.userChoice;
        if (outcome === 'accepted') {
          markPWAInstalled();
          return true;
        }
        globalDeferredPrompt = null;
        notifyPWASync();
        return false;
      } catch {
        setShowGuideModal(true);
        return false;
      }
    }
    setShowGuideModal(true);
    return false;
  };

  return {
    isInstallable: hasPrompt,
    isInstalled,
    platform,
    install,
    showGuideModal,
    openGuideModal: () => setShowGuideModal(true),
    closeGuideModal: () => setShowGuideModal(false),
    confirmManualInstall: () => {
      markPWAInstalled();
      setShowGuideModal(false);
    },
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Modo offline — aulas já abertas disponíveis</span>
    </div>
  );
};

interface PWAInstallGuideModalProps {
  initialPlatform: DevicePlatform;
  onClose: () => void;
  onConfirmInstalled: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  initialPlatform,
  onClose,
  onConfirmInstalled,
}) => {
  const [tab, setTab] = useState<DevicePlatform>(initialPlatform);
  const isInIframe =
    typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white border-2 border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SportUpLogo size="md" showWordmark={false} />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Instalar SportUp na Tela Inicial
              </h3>
              <p className="text-xs text-slate-500">
                Baixe como aplicativo no celular ou computador
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar instruções de instalação"
            className="min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Switcher: Apple | Android | PC */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab('apple')}
            className={`min-h-[40px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
              tab === 'apple'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Apple</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('android')}
            className={`min-h-[40px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
              tab === 'android'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('pc')}
            className={`min-h-[40px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
              tab === 'pc'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>PC</span>
          </button>
        </div>

        {tab === 'apple' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700 leading-relaxed">
            <p className="font-extrabold text-slate-900">
              iPhone / iPad (Safari):
            </p>
            <p>
              1. Toque no ícone{' '}
              <span className="inline-flex items-center gap-1 font-bold text-sky-700">
                <Share className="w-3.5 h-3.5" /> Compartilhar
              </span>{' '}
              na barra do Safari.
            </p>
            <p>
              2. Role para baixo e toque em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
            <p>
              3. Confirme em <strong>Adicionar</strong> no canto superior.
            </p>
            <p className="pt-1 border-t border-slate-200 text-slate-600">
              <strong>Mac (Safari):</strong> Clique em{' '}
              <strong>Arquivo → Adicionar ao Dock</strong>.
            </p>
          </div>
        )}

        {tab === 'android' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700 leading-relaxed">
            <p className="font-extrabold text-slate-900">
              Android (Chrome ou Edge):
            </p>
            <p>
              1. Toque no menu <strong>⋮</strong> (três pontinhos) no canto
              superior direito do navegador.
            </p>
            <p>
              2. Selecione <strong>Instalar aplicativo</strong> ou{' '}
              <strong>Adicionar à tela inicial</strong>.
            </p>
            <p>
              3. Toque em <strong>Instalar</strong> para confirmar.
            </p>
          </div>
        )}

        {tab === 'pc' && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700 leading-relaxed">
            <p className="font-extrabold text-slate-900">
              Computador (Windows / Linux — Chrome ou Edge):
            </p>
            <p>
              1. Na barra de endereço do navegador (à direita), clique no ícone{' '}
              <strong>Instalar SportUp</strong> (monitor com seta).
            </p>
            <p>
              2. Ou abra o menu <strong>⋮</strong> →{' '}
              <strong>Transmitir, salvar e compartilhar → Instalar página como app</strong>.
            </p>
            <p>
              3. Clique em <strong>Instalar</strong> para criar o atalho na área
              de trabalho.
            </p>
          </div>
        )}

        {isInIframe && typeof window !== 'undefined' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2 text-xs text-amber-900">
            <p className="font-semibold leading-snug">
              Navegadores bloqueiam a instalação de PWA dentro de prévias incorporadas. Abra o link público (ou seu site no GitHub Pages) direto no navegador para baixar o app com o logo oficial.
            </p>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[40px] rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir em nova aba para instalar</span>
            </a>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirmInstalled}
            className="flex-1 min-h-[44px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Já instalei</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm border-b-4 border-emerald-700"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC = () => {
  const {
    isInstalled,
    platform,
    install,
    showGuideModal,
    closeGuideModal,
    confirmManualInstall,
  } = usePWAInstall();

  if (isInstalled) return null;

  const label =
    platform === 'apple'
      ? 'Instalar SportUp no iPhone / Mac'
      : platform === 'android'
        ? 'Instalar aplicativo no Android'
        : 'Instalar aplicativo SportUp (PC / Celular)';

  return (
    <>
      <button
        type="button"
        onClick={install}
        className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm border-b-4 border-sky-700 transition px-4"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </button>

      {showGuideModal && (
        <PWAInstallGuideModal
          initialPlatform={platform}
          onClose={closeGuideModal}
          onConfirmInstalled={confirmManualInstall}
        />
      )}
    </>
  );
};

/**
 * Anúncio discreto e não intrusivo que aparece após alguns segundos
 * oferecendo a instalação do PWA na tela inicial e some ao instalar.
 */
export const PWAInstallFloatingAd: React.FC = () => {
  const {
    isInstalled,
    platform,
    install,
    showGuideModal,
    closeGuideModal,
    confirmManualInstall,
  } = usePWAInstall();

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(FLOATING_AD_DISMISSED_KEY) === '1';
  });

  useEffect(() => {
    if (isInstalled || dismissed) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 9000);

    return () => window.clearTimeout(timer);
  }, [isInstalled, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(FLOATING_AD_DISMISSED_KEY, '1');
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {visible && !dismissed && (
        <aside
          aria-label="Instalar aplicativo SportUp"
          className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-sm z-30 bg-white border-2 border-emerald-300 rounded-2xl p-3 shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300"
        >
          <SportUpLogo size="md" showWordmark={false} />

          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-slate-900 truncate">
              Instale o SportUp na tela inicial
            </p>
            <p className="text-[11px] text-slate-600 leading-tight">
              Acesso rápido no Apple, Android ou PC. Basta clicar em Instalar!
            </p>
          </div>

          <button
            type="button"
            onClick={install}
            className="min-h-[36px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs border-b-2 border-emerald-700 shrink-0 whitespace-nowrap"
          >
            Instalar
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar aviso de instalação"
            className="min-w-[28px] min-h-[28px] rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {showGuideModal && (
        <PWAInstallGuideModal
          initialPlatform={platform}
          onClose={closeGuideModal}
          onConfirmInstalled={confirmManualInstall}
        />
      )}
    </>
  );
};

/**
 * Semi-anúncio compacto posicionado logo acima do campo de digitação do chat do time.
 * Some automaticamente quando o PWA é instalado.
 */
export const PWAChatSemiBanner: React.FC = () => {
  const {
    isInstalled,
    platform,
    install,
    showGuideModal,
    closeGuideModal,
    confirmManualInstall,
  } = usePWAInstall();

  if (isInstalled) return null;

  return (
    <>
      <div className="bg-emerald-50 border-t border-emerald-200 px-3 py-2 flex items-center justify-between gap-2 shrink-0 min-h-[48px]">
        <div className="flex items-center gap-2 min-w-0">
          <SportUpLogo size="xs" showWordmark={false} />
          <p className="text-[11px] sm:text-xs font-bold text-emerald-950 truncate">
            Instale o SportUp na tela inicial (Apple, Android ou PC)
          </p>
        </div>

        <button
          type="button"
          onClick={install}
          className="min-h-[34px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs border-b-2 border-emerald-700 flex items-center gap-1 shrink-0 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>
      </div>

      {showGuideModal && (
        <PWAInstallGuideModal
          initialPlatform={platform}
          onClose={closeGuideModal}
          onConfirmInstalled={confirmManualInstall}
        />
      )}
    </>
  );
};
