import React, { useState, useEffect, useRef } from 'react';
import { Stimulus, RawAssociation, TimingEvent } from '../../types';
import { Clock, Send, X, AlertCircle, ArrowRight } from 'lucide-react';

interface Props {
  stimulus: Stimulus;
  currentStimulusIndex: number;
  totalStimuli: number;
  maxWords?: number;
  timeLimitSeconds?: number;
  onComplete: (associations: RawAssociation[], totalTimeMs: number) => void;
}

export const GenerationPhase: React.FC<Props> = ({
  stimulus,
  currentStimulusIndex,
  totalStimuli,
  maxWords = 10,
  timeLimitSeconds = 60,
  onComplete,
}) => {
  const safeTimeLimit = Math.max(10, Number(timeLimitSeconds) || 60);
  const safeMaxWords = Math.max(1, Number(maxWords) || 10);

  const [timeLeft, setTimeLeft] = useState(safeTimeLimit);
  const [currentWord, setCurrentWord] = useState('');
  const [associations, setAssociations] = useState<RawAssociation[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);

  const startTimeRef = useRef<number>(performance.now());
  const typingStartRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFinishedRef = useRef(false);
  const associationsRef = useRef<RawAssociation[]>(associations);
  associationsRef.current = associations;

  // Timer Countdown
  useEffect(() => {
    startTimeRef.current = performance.now();
    isFinishedRef.current = false;
    setTimeLeft(safeTimeLimit);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [stimulus?.id, safeTimeLimit]);

  // Handle time expiration safely outside state updater
  useEffect(() => {
    if (timeLeft === 0 && !isFinishedRef.current) {
      isFinishedRef.current = true;
      const totalDuration = Math.round(performance.now() - startTimeRef.current);
      onComplete(associationsRef.current, totalDuration);
    }
  }, [timeLeft, onComplete]);

  const handleFinishEarly = () => {
    let finalAssocs = [...associations];
    const trimmed = currentWord.trim();
    if (
      trimmed &&
      finalAssocs.length < safeMaxWords &&
      !finalAssocs.some(a => a.rawWord.toLowerCase() === trimmed.toLowerCase())
    ) {
      const now = performance.now();
      const newAssoc: RawAssociation = {
        rawWord: trimmed,
        generationOrder: finalAssocs.length + 1,
        rank: finalAssocs.length + 1,
        timing: {
          word: trimmed,
          confirmedMs: Math.round(now - startTimeRef.current),
        },
      };
      finalAssocs.push(newAssoc);
      setAssociations(finalAssocs);
      setCurrentWord('');
    }

    if (finalAssocs.length === 0) {
      if (!confirm('¿Seguro que deseas continuar sin agregar ninguna palabra para este concepto?')) {
        return;
      }
    }
    isFinishedRef.current = true;
    const totalDuration = Math.round(performance.now() - startTimeRef.current);
    onComplete(finalAssocs, totalDuration);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!typingStartRef.current) {
      typingStartRef.current = performance.now();
    }
    setCurrentWord(e.target.value);
    setInputError(null);
  };

  const handleAddWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = currentWord.trim();
    if (!trimmed) return;

    if (associations.length >= maxWords) {
      setInputError(`Has alcanzado el límite máximo de ${maxWords} palabras`);
      return;
    }

    // Check duplicate
    const lower = trimmed.toLowerCase();
    if (associations.some(a => a.rawWord.toLowerCase() === lower)) {
      setInputError('Esta palabra ya fue registrada en tu lista');
      return;
    }

    const now = performance.now();
    const confirmedMs = Math.round(now - startTimeRef.current);
    const typingDurationMs = typingStartRef.current
      ? Math.round(now - typingStartRef.current)
      : undefined;

    const timing: TimingEvent = {
      word: trimmed,
      startedTypingMs: typingStartRef.current
        ? Math.round(typingStartRef.current - startTimeRef.current)
        : undefined,
      confirmedMs,
      typingDurationMs,
    };

    const newAssoc: RawAssociation = {
      rawWord: trimmed,
      generationOrder: associations.length + 1,
      rank: associations.length + 1, // initial rank matches order
      timing,
    };

    const updated = [...associations, newAssoc];
    setAssociations(updated);
    setCurrentWord('');
    typingStartRef.current = null;
    setInputError(null);

    // Refocus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    // Auto finish if reached maximum words
    if (updated.length >= maxWords) {
      setTimeout(() => {
        isFinishedRef.current = true;
        const totalDuration = Math.round(performance.now() - startTimeRef.current);
        onComplete(updated, totalDuration);
      }, 300);
    }
  };

  const handleRemoveWord = (index: number) => {
    const updated = associations
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({
        ...item,
        generationOrder: idx + 1,
        rank: idx + 1,
      }));
    setAssociations(updated);
  };

  // Timer styling
  const isTimeCritical = timeLeft <= 10;
  const isTimeWarning = timeLeft <= 20 && timeLeft > 10;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Bar: Progress and Timer */}
      <header className="pt-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
          <span>
            Concepto {currentStimulusIndex + 1} de {totalStimuli}
          </span>
          <span>Fase 1: Asociación libre</span>
        </div>

        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Palabras:</span>
            <span className="px-2 py-0.5 bg-primary-50 text-primary-700 font-bold rounded-md text-xs">
              {associations.length} / {maxWords}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 font-mono font-bold text-base px-3 py-1 rounded-xl transition-all ${
              isTimeCritical
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : isTimeWarning
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
          </div>
        </div>
      </header>

      {/* Main Stimulus Presentation */}
      <main className="my-auto py-4 space-y-4">
        <div className="text-center space-y-1">
          <span className="text-[11px] font-bold tracking-widest text-primary-600 uppercase">
            Palabra Estímulo
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            {stimulus?.text || 'CONCEPTO'}
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto pt-1">
            Escribe hasta {safeMaxWords} palabras que relaciones con este concepto
          </p>
        </div>

        {/* Word Input Form */}
        <form onSubmit={handleAddWord} className="relative mt-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={currentWord}
              onChange={handleInputChange}
              disabled={associations.length >= maxWords || timeLeft === 0}
              placeholder={
                associations.length >= maxWords
                  ? 'Has completado las 10 palabras'
                  : 'Escribe una palabra aquí...'
              }
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              autoFocus
              className="flex-1 px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base shadow-xs"
            />
            <button
              type="submit"
              disabled={!currentWord.trim() || associations.length >= maxWords || timeLeft === 0}
              className="px-5 py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-xs flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {inputError && (
            <p className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1.5 px-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{inputError}</span>
            </p>
          )}
        </form>

        {/* Association Chips */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tus asociaciones ({associations.length}):
          </p>
          <div className="min-h-[100px] max-h-[220px] overflow-y-auto p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-2 content-start">
            {associations.length === 0 ? (
              <p className="text-xs text-slate-400 m-auto italic py-4">
                Tus palabras aparecerán aquí conforme las envíes...
              </p>
            ) : (
              associations.map((assoc, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200/60 transition-all animate-in fade-in zoom-in-95 duration-150"
                >
                  <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                  <span>{assoc.rawWord}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWord(idx)}
                    className="w-4 h-4 rounded-full text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors ml-0.5"
                    title="Eliminar palabra"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="pt-3 pb-6 border-t border-slate-200/60 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleFinishEarly}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 py-2.5 px-3 rounded-lg hover:bg-slate-200/50 transition-colors"
        >
          No se me ocurren más
        </button>

        <button
          type="button"
          onClick={handleFinishEarly}
          disabled={associations.length === 0}
          className="py-3 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
        >
          <span>Ir a jerarquizar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
};
