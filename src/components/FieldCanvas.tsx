import React, { useState } from 'react';
import {
  ArenaMode,
  CellType,
  Coord,
  NodeCostInfo,
  OnlineFrame,
  SearchResult,
  SearchStep,
} from '../types/field';
import { coordKey, getStepPenalty, isNearProtectedCrop, manhattan, findSpecialPositions } from '../engine/pathfinding';
import { Bot, Flag, ShieldAlert, Sprout, Mountain, HelpCircle, Play } from 'lucide-react';

interface FieldCanvasProps {
  grid: CellType[][];
  mode: ArenaMode;
  activeBrush: CellType | null;
  onPaintCell: (r: number, c: number) => void;
  penaltyWeight: number;
  searchResult: SearchResult | null;
  currentSearchStep: SearchStep | null;
  compareStandardResult: SearchResult | null;
  compareSafeResult: SearchResult | null;
  onlineFrame: OnlineFrame | null;
  showPathOverlay: boolean;
}

export const FieldCanvas: React.FC<FieldCanvasProps> = ({
  grid,
  mode,
  activeBrush,
  onPaintCell,
  penaltyWeight,
  searchResult,
  currentSearchStep,
  compareStandardResult,
  compareSafeResult,
  onlineFrame,
  showPathOverlay,
}) => {
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [hovered, setHovered] = useState<Coord | null>(null);

  const rows = grid.length;
  const cols = grid[0]?.length ?? 16;
  const { goal } = findSpecialPositions(grid);

  const frontierSet = new Set(
    currentSearchStep ? currentSearchStep.frontier.map(coordKey) : []
  );
  const exploredSet = new Set(
    currentSearchStep ? currentSearchStep.explored.map(coordKey) : []
  );
  const currentKey = currentSearchStep ? coordKey(currentSearchStep.current) : null;

  const discoveredSet = new Set(onlineFrame?.discoveredKeys ?? []);
  const sensorSet = new Set(onlineFrame?.sensorKeys ?? []);

  const buildPolylinePoints = (path: Coord[]) =>
    path.map((p) => `${p.c + 0.5},${p.r + 0.5}`).join(' ');

  const hoveredCellType = hovered ? grid[hovered.r][hovered.c] : null;
  const hoveredKey = hovered ? coordKey(hovered) : null;
  const hoveredPenalty = hovered ? getStepPenalty(grid, hovered.r, hovered.c, penaltyWeight) : 0;
  const hoveredCostInfo: NodeCostInfo | undefined = hoveredKey
    ? currentSearchStep?.costs[hoveredKey] ?? searchResult?.costsByKey[hoveredKey]
    : undefined;

  const cellTypeLabels: Record<CellType, string> = {
    SAFE: 'Safe Track',
    POTATO_ROW: 'Potato Crop Row (Impassable)',
    PROTECTED: 'Crop-Protection Bed (Restricted)',
    OBSTACLE: 'Known Obstacle',
    UNKNOWN_OBSTACLE: 'Unknown Obstacle (Hidden)',
    START: 'Robot Start Depot',
    GOAL: 'Monitoring Destination',
  };

  return (
    <div
      className="flex flex-col gap-3 select-none"
      onMouseLeave={() => {
        setIsPointerDown(false);
        setHovered(null);
      }}
      onMouseUp={() => setIsPointerDown(false)}
    >
      {/* Top Field Coordinate & Inspector Readout */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#14201a] border border-emerald-900/60 rounded-xl text-xs">
        <div className="flex items-center gap-3 text-emerald-200/80">
          <span className="font-display font-semibold text-emerald-100">
            Field Grid {rows}×{cols}
          </span>
          <span aria-hidden="true" className="text-emerald-700">·</span>
          <span>
            {activeBrush
              ? `Brush Active: ${cellTypeLabels[activeBrush]}`
              : 'Click a Brush on the right to edit tiles'}
          </span>
        </div>

        <div className="font-mono text-xs text-emerald-200 tabular-nums">
          {hovered && hoveredCellType ? (
            <div className="flex items-center gap-3">
              <span className="text-amber-300">
                ({hovered.r}, {hovered.c})
              </span>
              <span aria-hidden="true" className="text-emerald-700">/</span>
              <span>{cellTypeLabels[hoveredCellType]}</span>
              <span aria-hidden="true" className="text-emerald-700">/</span>
              <span>
                Step Cost:{' '}
                {hoveredCellType === 'OBSTACLE' ||
                hoveredCellType === 'PROTECTED' ||
                hoveredCellType === 'POTATO_ROW'
                  ? 'Blocked'
                  : `${1 + hoveredPenalty}${hoveredPenalty > 0 ? ` (+${hoveredPenalty} crop buffer)` : ''}`}
              </span>
              {hoveredCostInfo ? (
                <>
                  <span aria-hidden="true" className="text-emerald-700">/</span>
                  <span className="text-cyan-300">
                    g={hoveredCostInfo.g} h={hoveredCostInfo.h} f={hoveredCostInfo.f}
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="text-emerald-700">/</span>
                  <span className="text-emerald-400">
                    h={manhattan(hovered, goal)}
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-emerald-400/70">Hover any tile to inspect coordinates, cost, and heuristic h(n)</span>
          )}
        </div>
      </div>

      {/* Main Tactical Grid Board */}
      <div className="relative p-3 sm:p-4 bg-[#111b16] border border-emerald-900/70 rounded-2xl shadow-xl overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: `${cols} / ${rows}` }}>
          <div
            className="grid w-full h-full gap-[2px] bg-[#0a100d] p-[2px] rounded-lg"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const key = `${r},${c}`;
                const nearProtected =
                  cell === 'SAFE' && isNearProtectedCrop(grid, r, c) && penaltyWeight > 0;
                const isFrontier = mode === 'SEARCH' && frontierSet.has(key);
                const isExplored = mode === 'SEARCH' && exploredSet.has(key);
                const isCurrent = mode === 'SEARCH' && currentKey === key;
                const isDiscovered = mode === 'REPLAN' && discoveredSet.has(key);
                const isSensor = mode === 'REPLAN' && sensorSet.has(key);
                const isRobotHere =
                  mode === 'REPLAN' &&
                  onlineFrame &&
                  onlineFrame.robotPos.r === r &&
                  onlineFrame.robotPos.c === c;

                let baseBg = 'bg-[#251f19] hover:bg-[#312921]';
                if (cell === 'POTATO_ROW') baseBg = 'bg-[#1e3a24] hover:bg-[#24462b]';
                if (cell === 'PROTECTED') baseBg = 'bg-[#0d4a42] protected-hatch border border-emerald-400/30';
                if (cell === 'OBSTACLE') baseBg = 'bg-[#334155] border border-slate-500/40';
                if (cell === 'UNKNOWN_OBSTACLE') {
                  if (mode === 'REPLAN') {
                    baseBg = isDiscovered
                      ? 'bg-[#7c2d12] border border-amber-400'
                      : 'bg-[#251f19] border border-dashed border-amber-500/35';
                  } else {
                    baseBg = 'bg-[#3b2a1a] border border-dashed border-amber-400/60';
                  }
                }
                if (cell === 'START') baseBg = 'bg-[#0c4a6e] border border-sky-400/60';
                if (cell === 'GOAL') baseBg = 'bg-[#713f12] border border-amber-400/80';

                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Row ${r} Column ${c}: ${cellTypeLabels[cell]}`}
                    onMouseDown={() => {
                      setIsPointerDown(true);
                      onPaintCell(r, c);
                    }}
                    onMouseEnter={() => {
                      setHovered({ r, c });
                      if (isPointerDown && activeBrush) {
                        onPaintCell(r, c);
                      }
                    }}
                    className={`relative flex items-center justify-center rounded-[3px] transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer ${baseBg} ${
                      nearProtected ? 'safety-hatch' : ''
                    }`}
                  >
                    {/* Search exploration shading */}
                    {isExplored && cell === 'SAFE' && (
                      <span className="absolute inset-0 bg-teal-500/20 rounded-[2px] pointer-events-none" />
                    )}
                    {isFrontier && (
                      <span className="absolute inset-[1px] border border-cyan-300/80 bg-cyan-400/15 rounded-[2px] pointer-events-none" />
                    )}
                    {isCurrent && (
                      <span className="absolute inset-0 bg-amber-400/35 border-2 border-amber-300 rounded-[2px] pointer-events-none" />
                    )}

                    {/* Sensor radius highlight during Replan mode */}
                    {isSensor && (
                      <span className="absolute inset-0 bg-amber-400/12 border border-amber-400/25 rounded-[2px] pointer-events-none" />
                    )}

                    {/* Caution buffer indicator near Protected Crops */}
                    {nearProtected && (
                      <span
                        title={`Safety Buffer (+${penaltyWeight} cost)`}
                        className="absolute top-[2px] right-[2px] text-[8px] font-mono leading-none text-amber-300/80 pointer-events-none"
                      >
                        +{penaltyWeight}
                      </span>
                    )}

                    {/* Tile Iconography */}
                    {cell === 'POTATO_ROW' && (
                      <Sprout className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-lime-400/85 pointer-events-none" />
                    )}
                    {cell === 'PROTECTED' && (
                      <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 pointer-events-none" />
                    )}
                    {cell === 'OBSTACLE' && (
                      <Mountain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 pointer-events-none" />
                    )}
                    {cell === 'UNKNOWN_OBSTACLE' && (
                      isDiscovered ? (
                        <Mountain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 pointer-events-none" />
                      ) : (
                        <HelpCircle
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 pointer-events-none ${
                            mode === 'REPLAN' ? 'text-amber-400/45' : 'text-amber-300/90'
                          }`}
                        />
                      )
                    )}
                    {cell === 'START' && !isRobotHere && (
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300 fill-sky-300/40 pointer-events-none" />
                    )}
                    {cell === 'GOAL' && !isRobotHere && (
                      <Flag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 fill-amber-300/30 pointer-events-none" />
                    )}

                    {/* Active Robot Rover Unit */}
                    {isRobotHere && (
                      <span className="relative z-20 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-amber-400 text-[#0d1511] shadow-md">
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Vector SVG Path Layer */}
          <svg
            viewBox={`0 0 ${cols} ${rows}`}
            className="absolute inset-0 w-full h-full pointer-events-none z-10 p-[2px]"
            preserveAspectRatio="none"
          >
            {/* Mode 1: Single Algorithm Path */}
            {mode === 'SEARCH' && showPathOverlay && searchResult && searchResult.path.length > 1 && (
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="0.18"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolylinePoints(searchResult.path)}
              />
            )}

            {/* Mode 2: Crop-Safe Comparison (Standard vs Crop-Safe A*) */}
            {mode === 'CROP_COMPARE' && compareStandardResult && compareStandardResult.path.length > 1 && (
              <polyline
                fill="none"
                stroke="#fb7185"
                strokeWidth="0.16"
                strokeDasharray="0.24 0.16"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolylinePoints(compareStandardResult.path)}
              />
            )}
            {mode === 'CROP_COMPARE' && compareSafeResult && compareSafeResult.path.length > 1 && (
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="0.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolylinePoints(compareSafeResult.path)}
              />
            )}

            {/* Mode 3: Online Replan (Blocked Previous Route + Active Replanned Route + Traveled Trail) */}
            {mode === 'REPLAN' && onlineFrame && (
              <>
                {onlineFrame.previousRoute.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#fb7185"
                    strokeWidth="0.13"
                    strokeDasharray="0.22 0.16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPolylinePoints(onlineFrame.previousRoute)}
                  />
                )}
                {onlineFrame.activeRoute.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="0.15"
                    strokeDasharray="0.18 0.12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPolylinePoints(onlineFrame.activeRoute)}
                  />
                )}
                {onlineFrame.traveledPath.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="0.21"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPolylinePoints(onlineFrame.traveledPath)}
                  />
                )}
              </>
            )}
          </svg>
        </div>

        {/* Clean Legend Row */}
        <div className="mt-3 pt-3 border-t border-emerald-900/50 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-emerald-200/85">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#251f19] border border-emerald-800/60" />
            <span>Safe Lane</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#1e3a24] border border-lime-500/40" />
            <span>Potato Row</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#0d4a42] border border-emerald-400/50" />
            <span>Crop-Protection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#251f19] safety-hatch border border-amber-400/50" />
            <span>Buffer (+{penaltyWeight})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#334155] border border-slate-400/50" />
            <span>Obstacle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#3b2a1a] border border-dashed border-amber-400/80" />
            <span>Unknown Obstacle</span>
          </div>
          {mode === 'CROP_COMPARE' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-[3px] bg-rose-400" />
                <span>Standard A*</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-[3px] bg-emerald-400" />
                <span>Crop-Safe A*</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-[3px] bg-emerald-400" />
              <span>Planned / Traveled Path</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
