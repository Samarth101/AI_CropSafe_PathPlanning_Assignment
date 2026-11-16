import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { MissionId } from '../types/field';

interface MissionItem {
  id: MissionId;
  shortTitle: string;
  taskLabel: string;
  requirements: string[];
  howToComplete: string;
}

const MISSIONS: MissionItem[] = [
  {
    id: 'TASK_1',
    shortTitle: '01. Field Grid',
    taskLabel: 'Environment',
    requirements: [
      'Represent safe lanes, potato rows, protected beds, and obstacles on a 2D grid.',
      'Mark the robot Start Depot and Monitoring Destination clearly.',
    ],
    howToComplete: 'Paint any tile or load a field preset in the Field Arena.',
  },
  {
    id: 'TASK_2',
    shortTitle: '02. Formulation',
    taskLabel: 'State Space',
    requirements: [
      'Specify Initial State, 4-way Actions, Transition Model, and Goal Test.',
      'Define the step-cost function and admissible Manhattan heuristic.',
    ],
    howToComplete: 'Open Formulation and click "Mark Formulation Reviewed".',
  },
  {
    id: 'TASK_3',
    shortTitle: '03. 4 Search Algos',
    taskLabel: 'BFS/DFS/GBFS/A*',
    requirements: [
      'Implement BFS, DFS, Greedy Best-First Search, and A* Search.',
      'Explain and visualize heuristic-guided frontier expansion.',
    ],
    howToComplete: 'Select or animate a search algorithm in Search mode.',
  },
  {
    id: 'TASK_4',
    shortTitle: '04. Crop-Safe Cost',
    taskLabel: 'Buffer Penalty',
    requirements: [
      'Block entry into obstacles and crop-protection cells completely.',
      'Penalize lanes bordering protected beds so safer detours are preferred.',
    ],
    howToComplete: 'Switch to Crop-Safe mode or adjust the proximity penalty slider.',
  },
  {
    id: 'TASK_5',
    shortTitle: '05. Online Replan',
    taskLabel: 'Hidden Obstacle',
    requirements: [
      'Start with at least one unknown obstacle hidden from the robot.',
      'Detect it within sensor range, update the map, and replan via A*.',
    ],
    howToComplete: 'Run Start Rover Mission to completion in Replan mode.',
  },
  {
    id: 'TASK_6',
    shortTitle: '06. Benchmark',
    taskLabel: 'Comparison Table',
    requirements: [
      'Compare path length, expanded nodes, runtime, and goal reachability.',
      'Report replanning operations for the online-obstacle experiment.',
    ],
    howToComplete: 'Click "Run All Trials" or open the Benchmark comparison tab.',
  },
];

interface MissionTooltipProps {
  mission: MissionItem;
  align: 'left' | 'center' | 'right';
}

const MissionTooltip: React.FC<MissionTooltipProps> = ({ mission, align }) => {
  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  const caretClass =
    align === 'left'
      ? 'left-6'
      : align === 'right'
      ? 'right-6'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      role="tooltip"
      id={`tooltip-${mission.id}`}
      className={`pointer-events-none absolute top-full mt-2.5 z-40 w-72 sm:w-80 p-3.5 bg-[#0b120e] border border-amber-400/55 rounded-xl shadow-2xl transition-all duration-150 ${alignClass}`}
    >
      {/* Top Caret Pointer */}
      <span
        aria-hidden="true"
        className={`absolute -top-[6px] w-2.5 h-2.5 rotate-45 bg-[#0b120e] border-l border-t border-amber-400/55 ${caretClass}`}
      />

      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-emerald-900/60">
        <span className="font-display font-semibold text-xs text-emerald-50">
          {mission.shortTitle}
        </span>
        <span className="text-[11px] font-medium text-amber-300">
          Pending · {mission.taskLabel}
        </span>
      </div>

      <ul className="space-y-1.5 text-xs text-emerald-200/90 leading-relaxed">
        {mission.requirements.map((req, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-amber-400 font-mono text-[11px] mt-[1px]" aria-hidden="true">
              {idx + 1}.
            </span>
            <span>{req}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2.5 pt-2 border-t border-emerald-900/50 text-[11px] text-emerald-300/90">
        <span className="font-semibold text-amber-300">How to clear: </span>
        {mission.howToComplete}
      </div>
    </div>
  );
};

interface MissionStripProps {
  completed: Record<MissionId, boolean>;
  onSelectMission: (id: MissionId) => void;
}

export const MissionStrip: React.FC<MissionStripProps> = ({ completed, onSelectMission }) => {
  const [hoveredId, setHoveredId] = useState<MissionId | null>(null);
  const doneCount = Object.values(completed).filter(Boolean).length;
  const nextPending = MISSIONS.find((m) => !completed[m.id]);

  return (
    <div
      className="bg-[#131e18] border border-emerald-900/60 rounded-xl p-3.5 space-y-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setHoveredId(null);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-emerald-200/90">
          <span className="font-display font-semibold text-sm text-emerald-50">
            Assignment Milestone Progress
          </span>
          <span aria-hidden="true" className="text-emerald-700">·</span>
          <span className="font-mono tabular-nums text-amber-300">
            {doneCount} / 6 Completed
          </span>
        </div>

        {nextPending ? (
          <button
            type="button"
            onClick={() => onSelectMission(nextPending.id)}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Next: {nextPending.shortTitle}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-xs font-medium text-emerald-400">
            All 6 Milestones Verified
          </span>
        )}
      </div>

      {/* 6-Stage Segmented Progress Bar */}
      <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
        {MISSIONS.map((m) => (
          <div
            key={`bar-${m.id}`}
            className={`h-1.5 rounded-sm transition-colors duration-200 ${
              completed[m.id] ? 'bg-emerald-400' : 'bg-[#0b120f] border border-emerald-900/60'
            }`}
          />
        ))}
      </div>

      {/* Interactive Milestone Buttons + Floating Requirements Tooltip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {MISSIONS.map((m, idx) => {
          const isDone = completed[m.id];
          const showTooltip = !isDone && hoveredId === m.id;
          const align: 'left' | 'center' | 'right' =
            idx <= 1 ? 'left' : idx >= 4 ? 'right' : 'center';

          return (
            <div
              key={m.id}
              className="relative"
              onMouseEnter={() => setHoveredId(m.id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === m.id ? null : cur))}
            >
              <button
                type="button"
                aria-describedby={showTooltip ? `tooltip-${m.id}` : undefined}
                onFocus={() => setHoveredId(m.id)}
                onBlur={() => setHoveredId((cur) => (cur === m.id ? null : cur))}
                onClick={() => {
                  setHoveredId(null);
                  onSelectMission(m.id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isDone
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-100 hover:bg-emerald-900/60'
                    : 'bg-[#0e1713] border-emerald-900/60 text-emerald-200/80 hover:border-amber-400/60 hover:text-emerald-50'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-amber-400/75 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-display font-semibold text-xs truncate">{m.shortTitle}</div>
                  <div className="text-[11px] text-emerald-400/75 truncate">{m.taskLabel}</div>
                </div>
              </button>

              {showTooltip && <MissionTooltip mission={m} align={align} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
