import React from 'react';
import { Project, Stimulus } from '../../types';
import { Clock, ShieldCheck, BookOpen, ChevronRight, Sparkles } from 'lucide-react';

interface Props {
  project: Project;
  stimuli: Stimulus[];
  onStart: () => void;
}

export const WelcomePage: React.FC<Props> = ({ project, stimuli, onStart }) => {
  const estimatedMinutes = Math.max(2, Math.ceil(stimuli.length * 1.5));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="pt-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Actividad Académica Participativa</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
          {project.title}
        </h1>
        {project.institution && (
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            {project.institution}
          </p>
        )}
      </header>

      {/* Main Card */}
      <main className="my-6 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-4">
        {/* Welcome Message */}
        <div className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
          {project.welcomeMessage ||
            'En esta actividad exploraremos las palabras que asociamos espontáneamente con determinados conceptos.\n\nNo existen respuestas correctas o incorrectas. Nos interesa conocer qué palabras vienen a tu mente y qué importancia les atribuyes.'}
        </div>

        {/* Study Details Badges */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
            <Clock className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">{estimatedMinutes} minutos</p>
              <p className="text-slate-500">Tiempo estimado</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
            <BookOpen className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-800">{stimuli.length} conceptos</p>
              <p className="text-slate-500">A explorar</p>
            </div>
          </div>
        </div>

        {/* Privacy & Voluntary info */}
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            {project.consentText ||
              'Tu participación es voluntaria y anónima. Tus respuestas serán procesadas únicamente con fines de investigación científica y docencia.'}
          </p>
        </div>
      </main>

      {/* Footer / CTA Button */}
      <footer className="pb-6">
        <button
          onClick={onStart}
          className="w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white rounded-xl font-bold text-base shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <span>Continuar a las instrucciones</span>
          <ChevronRight className="w-5 h-5" />
        </button>
        {project.researcher && (
          <p className="text-center text-[11px] text-slate-400 mt-3">
            Responsable: {project.researcher}
          </p>
        )}
      </footer>
    </div>
  );
};
