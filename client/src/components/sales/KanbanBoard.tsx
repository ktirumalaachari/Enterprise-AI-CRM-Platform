import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, User, Building2, TrendingUp, GripVertical, AlertCircle } from 'lucide-react';

export type DealStage = 'Lead' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface DealItem {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  customer?: { id: string; name: string; company?: string; email: string };
  assignedTo?: { id: string; name: string; avatar?: string; role: string };
  expectedCloseDate?: string;
  createdAt?: string;
}

interface KanbanBoardProps {
  deals: DealItem[];
  onStageChange: (dealId: string, newStage: DealStage) => void;
  onSelectDeal?: (deal: DealItem) => void;
  isLoading?: boolean;
}

const STAGES: { key: DealStage; label: string; color: string; border: string; bg: string }[] = [
  { key: 'Lead', label: 'Lead In', color: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/60', bg: 'bg-blue-50/50 dark:bg-blue-950/40' },
  { key: 'Contacted', label: 'Contacted', color: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-900/60', bg: 'bg-indigo-50/50 dark:bg-indigo-950/40' },
  { key: 'Proposal', label: 'Proposal Sent', color: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/60', bg: 'bg-amber-50/50 dark:bg-amber-950/40' },
  { key: 'Negotiation', label: 'Negotiation', color: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-900/60', bg: 'bg-purple-50/50 dark:bg-purple-950/40' },
  { key: 'Won', label: 'Closed Won', color: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/60', bg: 'bg-emerald-50/50 dark:bg-emerald-950/40' },
  { key: 'Lost', label: 'Closed Lost', color: 'text-red-700 dark:text-rose-400', border: 'border-red-200 dark:border-rose-900/60', bg: 'bg-red-50/50 dark:bg-rose-950/40' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  deals,
  onStageChange,
  onSelectDeal,
  isLoading = false,
}) => {
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<DealStage | null>(null);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageKey: DealStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== stageKey) {
      setDragOverColumn(stageKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    setDragOverColumn(null);
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (dealId) {
      onStageChange(dealId, targetStage);
    }
    setDraggedDealId(null);
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1200px] items-start">
        {STAGES.map((stage) => {
          const columnDeals = deals.filter((d) => d.stage === stage.key);
          const columnTotal = columnDeals.reduce((sum, d) => sum + d.value, 0);
          const isOver = dragOverColumn === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
              className={`flex-1 flex flex-col rounded-xl border transition-all duration-200 min-w-[220px] max-w-[260px] overflow-hidden ${
                isOver
                  ? 'border-brand-primary dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-md scale-[1.01]'
                  : 'border-brand-border dark:border-zinc-800 bg-slate-50/60 dark:bg-[#121212]'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3 border-b border-brand-border dark:border-zinc-800 rounded-t-xl flex items-center justify-between ${stage.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
                  <span className="bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-brand-border dark:border-zinc-700 text-brand-textSecondary dark:text-zinc-300">
                    {columnDeals.length}
                  </span>
                </div>
                <span className="text-xs font-bold text-brand-textPrimary dark:text-white">
                  ${columnTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Column Body / Cards List */}
              <div className="p-2.5 flex flex-col gap-2.5 min-h-[420px] max-h-[620px] overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="h-28 bg-white dark:bg-[#18181B] border border-brand-border dark:border-zinc-800 rounded-lg animate-pulse" />
                  ))
                ) : columnDeals.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-zinc-800 dark:bg-zinc-900/30 rounded-lg text-slate-400 dark:text-zinc-600 text-xs italic">
                    Drop deals here
                  </div>
                ) : (
                  columnDeals.map((deal) => {
                    const isDraggingThis = draggedDealId === deal.id;
                    return (
                      <motion.div
                        key={deal.id}
                        layout
                        draggable
                        onDragStart={(e) => handleDragStart(e as any, deal.id)}
                        onClick={() => onSelectDeal && onSelectDeal(deal)}
                        className={`bg-white dark:bg-[#18181B] border rounded-xl p-3 smooth-shadow hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative ${
                          isDraggingThis
                            ? 'opacity-40 border-brand-primary dark:border-blue-500'
                            : 'border-brand-border dark:border-zinc-800 hover:border-brand-primary/40 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <h4 className="font-bold text-xs text-brand-textPrimary dark:text-white group-hover:text-brand-primary dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                            {deal.title}
                          </h4>
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-slate-400 dark:group-hover:text-zinc-400 flex-shrink-0 cursor-grab" />
                        </div>

                        {deal.customer && (
                          <div className="flex items-center gap-1.5 text-[11px] text-brand-textSecondary dark:text-zinc-400 mb-2">
                            <Building2 className="w-3 h-3 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                            <span className="truncate">{deal.customer.company || deal.customer.name}</span>
                          </div>
                        )}

                        {/* Probability Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2.5">
                          <div
                            className={`h-full transition-all duration-300 ${
                              deal.stage === 'Won'
                                ? 'bg-emerald-500'
                                : deal.stage === 'Lost'
                                ? 'bg-red-400'
                                : 'bg-brand-primary dark:bg-blue-500'
                            }`}
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>

                        {/* Card Footer */}
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-2 text-[11px]">
                          <span className="font-bold text-brand-textPrimary dark:text-white">
                            ${deal.value.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                              {deal.probability}%
                            </span>
                            {deal.assignedTo && (
                              <div
                                className="w-5 h-5 bg-brand-primary/10 dark:bg-blue-950/60 rounded-full flex items-center justify-center text-[9px] font-bold text-brand-primary dark:text-blue-400 border border-brand-primary/20 dark:border-blue-800 uppercase"
                                title={deal.assignedTo.name}
                              >
                                {deal.assignedTo.name.substring(0, 2)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick stage selector for accessibility */}
                        <div className="mt-2 pt-1 border-t border-slate-50 dark:border-zinc-800/60 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 dark:text-zinc-500 font-medium">Stage:</span>
                          <select
                            value={deal.stage}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              onStageChange(deal.id, e.target.value as DealStage);
                            }}
                            className="bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-1 py-0.5 text-[10px] text-slate-700 dark:text-zinc-300 outline-none cursor-pointer"
                          >
                            <option value="Lead">Lead</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Proposal">Proposal</option>
                            <option value="Negotiation">Negotiation</option>
                            <option value="Won">Closed Won</option>
                            <option value="Lost">Closed Lost</option>
                          </select>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
