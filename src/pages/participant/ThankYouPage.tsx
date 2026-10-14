import React, { useEffect } from 'react';
import { Project } from '../../types';
import { CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  project: Project;
}

export const ThankYouPage: React.FC<Props> = ({ project }) => {
  useEffect(() => {
    // Fire celebratory confetti on mounting
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignored if canvas not available
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 max-w-md mx-auto text-center">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6 w-full animate-in zoom-in-95 duration-200">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            ¡Participación Completada!
          </h1>
          <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block">
            Respuestas registradas exitosamente
          </p>
        </div>

        {/* Thank You Message */}
        <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
          {project.thankYouMessage ||
            '¡Gracias por participar!\n\nTus respuestas se han registrado correctamente.\n\nCon la participación de personas como tú, podemos estudiar cómo se organizan los significados que atribuimos a diferentes conceptos.'}
        </div>

        {/* Study Details */}
        <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">{project.title}</p>
          {project.institution && <p>{project.institution}</p>}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Sesión finalizada de forma anónima y segura</span>
          </div>
        </div>
      </div>
    </div>
  );
};
