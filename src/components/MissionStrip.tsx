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
    shortTitle: '1. Field Map',
    taskLabel: 'Build the grid',
    requirements: [
      'Show safe lanes, potato plants, protected seedlings, and rocks on a 2D map.',
      'Mark where the robot starts and where it needs to go.',
    ],
    howToComplete: 'Click a paint tool or choose a preset map on the right.',
  },
  {
    id: 'TASK_2',
    shortTitle: '2. Robot Rules',
    taskLabel: 'How it thinks',
    requirements: [
      'List where the robot starts, which 4 directions it can move, and how it reaches the goal.',
      'Explain how step cost and straight-line distance estimates work.',
    ],
    howToComplete: 'Open "How It Thinks" and click "Got It, Mark Complete".',
  },
  {
    id: 'TASK_3',
    shortTitle: '3. Search Methods',
    taskLabel: '4 AI explorers',
    requirements: [
      'Run Breadth-First, Depth-First, Greedy Best-First, and A* Search.',
      'Watch how each one explores tiles before picking a route.',
    ],
    howToComplete: 'Pick any search method and press "Play Animation".',
  },
  {
    id: 'TASK_4',
    shortTitle: '4. Crop Safety',
    taskLabel: 'Protect seedlings',
    requirements: [
      'Never let the robot drive onto rocks or protected seedling beds.',
      'Add an extra penalty cost next to seedlings so the robot stays safely away.',
    ],
    howToComplete: 'Click "Crop Safety" mode and slide the extra penalty up or down.',
  },
  {
    id: 'TASK_5',
    shortTitle: '5. Live Detour',
    taskLabel: 'Hidden rocks',
    requirements: [
      'Hide at least one surprise rock that the robot does not know about at first.',
      'Let the robot spot it with its sensor, update its map, and plan a new route.',
    ],
    howToComplete: 'Switch to "Live Detour" and press "Start Robot Drive".',
  },
  {
    id: 'TASK_6',
    shortTitle: '6. Results Table',
    taskLabel: 'Compare all',
    requirements: [
      'Compare steps taken, tiles checked, speed, and whether the robot arrived.',
      'Count how many times the robot had to change routes during the detour test.',
    ],
    howToComplete: 'Click "Compare All 6" in the top bar or open "Results Table".',
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
      <span
        aria-hidden="true"
        className={`absolute -top-[6px] w-2.5 h-2.5 rotate-45 bg-[#0b120e] border-l border-t border-amber-400/55 ${caretClass}`}
      />

      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-emerald-900/60">
        <span className="font-display font-bold text-sm text-emerald-50">
          {mission.shortTitle}
        </span>
        <span className="text-[11px] font-medium text-amber-300">
          To Do · {mission.taskLabel}
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
        <span className="font-semibold text-amber-300">Try this: </span>
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
          <span className="font-display font-bold text-base text-emerald-50">
            Your 6 Assignment Quests
          </span>
          <span aria-hidden="true" className="text-emerald-700">·</span>
          <span className="font-mono tabular-nums text-amber-300 font-medium">
            {doneCount} of 6 Done
          </span>
          <span aria-hidden="true" className="text-emerald-700 hidden sm:inline">·</span>
          <span className="text-emerald-300/75 hidden sm:inline">
            Hover any unfinished quest to see what it needs
          </span>
        </div>

        {nextPending ? (
          <button
            type="button"
            onClick={() => onSelectMission(nextPending.id)}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Jump to {nextPending.shortTitle}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-xs font-medium text-emerald-400">
            All 6 Quests Complete!
          </span>
        )}
      </div>

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
                  <div className="font-display font-bold text-xs truncate">{m.shortTitle}</div>
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
