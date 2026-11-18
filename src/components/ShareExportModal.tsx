import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  MessageCircle,
  Send,
  Share2,
  X,
} from 'lucide-react';
import {
  buildTelegramUrl,
  buildWhatsAppUrl,
  getAppShareUrl,
} from '../lib/shareExport';

export interface ShareExportPayload {
  title: string;
  text: string;
  fileName?: string;
}

interface ShareExportModalProps {
  payload: ShareExportPayload;
  onClose: () => void;
}

export const ShareExportModal: React.FC<ShareExportModalProps> = ({
  payload,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload.text);
      setCopied(true);
      setShareStatus('Texto copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setShareStatus('Não foi possível copiar automaticamente. Selecione o texto abaixo.');
    }
  };

  const handleNativeShare = async () => {
    if (!supportsNativeShare) return;
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: getAppShareUrl(),
      });
    } catch {
      // Usuário cancelou o menu nativo de compartilhamento
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([payload.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = payload.fileName || 'sportup-export.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setShareStatus('Arquivo .txt baixado!');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {payload.title}
              </h3>
              <p className="text-xs text-slate-500">
                Exporte para WhatsApp, redes sociais ou arquivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar compartilhamento"
            className="min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <pre className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 text-xs text-slate-700 font-sans whitespace-pre-wrap break-words max-h-44 overflow-y-auto leading-relaxed">
          {payload.text}
        </pre>

        {shareStatus && (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {shareStatus}
          </p>
        )}

        {/* Export Channels */}
        <div className="space-y-2.5">
          <a
            href={buildWhatsAppUrl(payload.text)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-sm border-b-4 border-[#15803D] flex items-center justify-center gap-2 transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Enviar pelo WhatsApp</span>
          </a>

          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={buildTelegramUrl(payload.text)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs border-b-4 border-sky-700 flex items-center justify-center gap-1.5 transition"
            >
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </a>

            {supportsNativeShare ? (
              <button
                type="button"
                onClick={handleNativeShare}
                className="min-h-[44px] rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs border-b-4 border-indigo-700 flex items-center justify-center gap-1.5 transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Outros apps</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[44px] rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs border-b-4 border-slate-950 flex items-center justify-center gap-1.5 transition"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copied ? 'Copiado!' : 'Copiar texto'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {supportsNativeShare && (
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[42px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copied ? 'Copiado!' : 'Copiar texto'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadTxt}
              className={`min-h-[42px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                supportsNativeShare ? '' : 'col-span-2'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Baixar resumo (.txt)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
