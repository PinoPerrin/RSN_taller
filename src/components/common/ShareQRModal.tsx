import React, { useRef, useState } from 'react';
import { Project } from '../../types';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { X, Copy, Check, Download, ExternalLink, QrCode } from 'lucide-react';

interface Props {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareQRModal: React.FC<Props> = ({ project, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const publicUrl = `${window.location.origin}/p/${project.publicId || project.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_${project.publicId || project.id}.png`;
    a.click();
  };

  const handleDownloadSVG = () => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR_${project.publicId || project.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-slate-200 relative space-y-5 animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-2">
            <QrCode className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-snug">
            Acceso al Estudio
          </h2>
          <p className="text-xs text-slate-500 truncate px-2">{project.title}</p>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center shadow-inner">
          <div ref={canvasRef} className="hidden">
            <QRCodeCanvas value={publicUrl} size={300} level="H" includeMargin />
          </div>
          <div ref={svgRef} className="p-2 bg-white rounded-xl shadow-xs">
            <QRCodeSVG value={publicUrl} size={180} level="H" includeMargin />
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-3 text-center">
            Escanea con la cámara del teléfono para ingresar
          </p>
        </div>

        {/* Link Input & Copy */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Enlace de Participación
          </label>
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="bg-transparent text-xs text-slate-700 font-mono px-2 flex-1 outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs text-xs font-semibold flex items-center gap-1 transition-all"
              title="Copiar enlace"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] text-emerald-600 font-bold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownloadPNG}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar PNG</span>
          </button>
          <button
            onClick={handleDownloadSVG}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar SVG</span>
          </button>
        </div>

        {/* Open Preview Button */}
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
        >
          <span>Abrir vista previa de participante</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
