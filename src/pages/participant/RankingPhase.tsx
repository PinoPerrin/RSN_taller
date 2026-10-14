import React, { useState } from 'react';
import { Stimulus, RawAssociation } from '../../types';
import { ArrowUp, ArrowDown, Check, GripVertical, AlertTriangle } from 'lucide-react';

interface Props {
  stimulus: Stimulus;
  associations: RawAssociation[];
  currentStimulusIndex: number;
  totalStimuli: number;
  onConfirm: (rankedAssociations: RawAssociation[], rankingTimeMs: number) => void;
}

export const RankingPhase: React.FC<Props> = ({
  stimulus,
  associations: initialAssociations,
  currentStimulusIndex,
  totalStimuli,
  onConfirm,
}) => {
  // Items with their current assigned rank (1 to m)
  const [items, setItems] = useState<RawAssociation[]>(() => {
    // Start with initial ranks matching 1..m
    return initialAssociations.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  });

  const [startTime] = useState<number>(performance.now());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const m = items.length;

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= m) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Reassign ranks 1 to m strictly
    const updated = reordered.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
    setItems(updated);
  };

  const handleRankSelect = (currentIndex: number, newRank: number) => {
    const targetIndex = newRank - 1;
    moveItem(currentIndex, targetIndex);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    moveItem(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    const rankingTimeMs = Math.round(performance.now() - startTime);
    onConfirm(items, rankingTimeMs);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Header */}
      <header className="pt-2 text-center">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
          <span>
            Concepto {currentStimulusIndex + 1} de {totalStimuli}
          </span>
          <span className="font-bold text-indigo-700">Fase 2: Jerarquización</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs mt-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Concepto evaluado
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {stimulus.text}
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Ordena tus palabras según qué tan importantes son para describir{' '}
            <strong>{stimulus.text}</strong>.
          </p>
          <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
            El <strong>#1</strong> es la palabra más importante.
          </p>
        </div>
      </header>

      {/* Main Ranking List */}
      <main className="my-4 space-y-2 max-h-[58vh] overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p>No registraste palabras para este concepto.</p>
          </div>
        ) : (
          items.map((item, index) => {
            const isFirst = item.rank === 1;

            return (
              <div
                key={item.rawWord}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 p-3 bg-white rounded-xl border transition-all ${
                  isFirst
                    ? 'border-indigo-400 bg-indigo-50/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                } ${draggedIndex === index ? 'opacity-40 scale-98' : ''}`}
              >
                {/* Drag Handle */}
                <div
                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 flex-shrink-0 touch-none"
                  title="Arrastrar para ordenar"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Rank Badge */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isFirst
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.rank}
                </div>

                {/* Word Label */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{item.rawWord}</p>
                  <p className="text-[10px] text-slate-400">
                    {isFirst ? '★ Más representativa' : `Prioridad ${item.rank}`}
                  </p>
                </div>

                {/* Mobile Single-Tap Up / Down Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, index - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition-colors"
                    title="Subir posición"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={index === m - 1}
                    onClick={() => moveItem(index, index + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-slate-700 transition-colors"
                    title="Bajar posición"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Position selector dropdown for fast jump */}
                  <select
                    value={item.rank}
                    onChange={e => handleRankSelect(index, Number(e.target.value))}
                    className="h-7 px-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold border-none focus:ring-1 focus:ring-indigo-500"
                    title="Cambiar posición directamente"
                  >
                    {Array.from({ length: m }, (_, i) => i + 1).map(pos => (
                      <option key={pos} value={pos}>
                        #{pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Confirmation Button */}
      <footer className="pb-6">
        <button
          onClick={handleFinalSubmit}
          disabled={isSubmitting}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 text-white rounded-xl font-extrabold text-base shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
        >
          <Check className="w-5 h-5" />
          <span>Confirmar respuestas</span>
        </button>
        <p className="text-center text-[11px] text-slate-400 mt-2">
          Una vez confirmadas, no podrás modificar este concepto
        </p>
      </footer>
    </div>
  );
};
