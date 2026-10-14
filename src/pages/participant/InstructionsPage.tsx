import React, { useState } from 'react';
import { PenTool, ArrowDownNarrowWide, HelpCircle, CheckCircle2, Play } from 'lucide-react';

interface Props {
  timeLimitSeconds: number;
  maxAssociations: number;
  onProceed: () => void;
}

export const InstructionsPage: React.FC<Props> = ({
  timeLimitSeconds = 60,
  maxAssociations = 10,
  onProceed,
}) => {
  const [exampleStep, setExampleStep] = useState<'generation' | 'ranking'>('generation');

  // Interactive neutral example: ÁRBOL
  const exampleWords = [
    { word: 'Hojas', rank: 3 },
    { word: 'Naturaleza', rank: 2 },
    { word: 'Sombra', rank: 1 },
    { word: 'Raíz', rank: 4 },
    { word: 'Verde', rank: 5 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="pt-2 text-center">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Instrucciones de la Actividad
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          La tarea consta de dos fases breves y sencillas
        </p>
      </header>

      {/* Main Instructions Cards */}
      <main className="my-4 space-y-3.5">
        {/* Phase 1: Free Association */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary-500" />
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
              1
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-primary-600" />
                <span>Fase 1: Asociación libre</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Aparecerá un concepto. Tendrás <strong>{timeLimitSeconds} segundos</strong> para escribir hasta{' '}
                <strong>{maxAssociations} palabras</strong> que relaciones directamente con él.
              </p>
              <p className="text-[11px] text-slate-500 italic">
                Escribe lo primero que venga a tu mente. No hay respuestas correctas ni incorrectas.
              </p>
            </div>
          </div>
        </div>

        {/* Phase 2: Hierarchical Ranking */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-500" />
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
              2
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <ArrowDownNarrowWide className="w-4 h-4 text-indigo-600" />
                <span>Fase 2: Jerarquización</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Al terminar el tiempo, ordenarás las palabras que escribiste según qué tan importantes son para ti.
              </p>
              <p className="text-[11px] text-slate-500">
                Asigna el <strong>número 1</strong> a la más importante, el <strong>número 2</strong> a la siguiente, y así sucesivamente sin repetir posiciones.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Neutral Example */}
        <div className="bg-slate-100/90 rounded-2xl p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Ejemplo Ilustrativo</span>
            </span>
            <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setExampleStep('generation')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  exampleStep === 'generation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                1. Palabras
              </button>
              <button
                type="button"
                onClick={() => setExampleStep('ranking')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  exampleStep === 'ranking' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                2. Orden
              </button>
            </div>
          </div>

          <div className="text-center py-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Concepto</span>
            <p className="text-base font-extrabold text-emerald-800">ÁRBOL</p>
          </div>

          {exampleStep === 'generation' ? (
            <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
              {exampleWords.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  {item.word}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              {[...exampleWords]
                .sort((a, b) => a.rank - b.rank)
                .map((item) => (
                  <div
                    key={item.word}
                    className="flex items-center justify-between px-3 py-1 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <span className="font-medium text-slate-800">{item.word}</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[11px]">
                      Posición {item.rank}
                    </span>
                  </div>
                ))}
            </div>
          )}

          <p className="text-[10px] text-slate-500 text-center mt-2.5">
            * Este ejemplo es solo ilustrativo. Las palabras del estudio real serán diferentes.
          </p>
        </div>
      </main>

      {/* Action Button */}
      <footer className="pb-6">
        <button
          onClick={onProceed}
          className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl font-extrabold text-base shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Entendido, comenzar</span>
        </button>
        <p className="text-center text-[11px] text-slate-400 mt-2">
          El cronómetro iniciará inmediatamente al presionar este botón
        </p>
      </footer>
    </div>
  );
};
