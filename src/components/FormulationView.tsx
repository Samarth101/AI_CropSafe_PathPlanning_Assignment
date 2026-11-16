import React, { useState } from 'react';
import { CellType, Coord } from '../types/field';
import {
  findSpecialPositions,
  getStepPenalty,
  isNearProtectedCrop,
  isPassable,
  manhattan,
} from '../engine/pathfinding';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass } from 'lucide-react';

interface FormulationViewProps {
  grid: CellType[][];
  penaltyWeight: number;
  onAcknowledgeFormulation: () => void;
}

export const FormulationView: React.FC<FormulationViewProps> = ({
  grid,
  penaltyWeight,
  onAcknowledgeFormulation,
}) => {
  const { start, goal } = findSpecialPositions(grid);
  const rows = grid.length;
  const cols = grid[0]?.length ?? 16;

  const [probe, setProbe] = useState<Coord>(start);

  const actions = [
    { name: 'Up', dr: -1, dc: 0, icon: ArrowUp },
    { name: 'Right', dr: 0, dc: 1, icon: ArrowRight },
    { name: 'Down', dr: 1, dc: 0, icon: ArrowDown },
    { name: 'Left', dr: 0, dc: -1, icon: ArrowLeft },
  ];

  const probeH = manhattan(probe, goal);
  const probeNearProtected = isNearProtectedCrop(grid, probe.r, probe.c);
  const probePenalty = getStepPenalty(grid, probe.r, probe.c, penaltyWeight);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-emerald-50">
            02. Problem Formulation & Heuristic Design
          </h2>
          <p className="mt-1 text-sm text-emerald-200/80 max-w-3xl">
            Formal state-space specification synchronized live with your active {rows}×{cols} potato-field map, including movement rules, transition dynamics, crop-safe cost penalties, and Manhattan heuristic proof.
          </p>
        </div>
        <button
          type="button"
          onClick={onAcknowledgeFormulation}
          className="px-4 py-2 text-sm font-medium bg-amber-400 text-[#0d1511] rounded-lg hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Mark Formulation Reviewed
        </button>
      </div>

      {/* 5 Core Formulation Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">1. Initial State</div>
          <div className="font-mono text-lg font-semibold text-emerald-50 tabular-nums">
            s₀ = ({start.r}, {start.c})
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            The robot begins at the Start Depot cell on the 2D discrete grid <span className="font-mono text-emerald-100">{rows} × {cols}</span>. States are integer row-column pairs <span className="font-mono text-emerald-100">(r, c)</span>.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">2. Available Actions</div>
          <div className="font-mono text-sm font-semibold text-emerald-50">
            A(s) ⊆ {'{Up, Right, Down, Left}'}
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            4-directional cardinal movement along tilled tracks between potato rows: <span className="font-mono text-emerald-100">(-1,0), (0,+1), (+1,0), (0,-1)</span>. Diagonal cutting across crop ridges is disallowed to protect plants.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">3. Transition Model</div>
          <div className="font-mono text-sm font-semibold text-emerald-50">
            Result(s, a) = (r + Δr, c + Δc)
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            Deterministic transition valid only when <span className="font-mono text-emerald-100">s&apos;</span> is inside grid bounds and is neither an <span className="text-emerald-100">Obstacle</span>, <span className="text-emerald-100">Potato Row</span>, nor <span className="text-emerald-100">Crop-Protection</span> cell.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">4. Goal Test</div>
          <div className="font-mono text-lg font-semibold text-emerald-50 tabular-nums">
            IsGoal(s) := (s == ({goal.r}, {goal.c}))
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            Returns <span className="font-mono text-emerald-100">True</span> when the rover reaches the Monitoring Destination coordinates <span className="font-mono text-emerald-100">({goal.r}, {goal.c})</span>.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">5. Path-Cost Function (Task 4)</div>
          <div className="font-mono text-sm font-semibold text-emerald-50 tabular-nums">
            c(s, a, s&apos;) = 1 + penalty(s&apos;)
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            Each move incurs base cost <span className="font-mono text-emerald-100">1</span>. Entering a safe cell orthogonally adjacent to any <span className="text-emerald-100">Crop-Protection</span> bed adds <span className="font-mono text-amber-300">+{penaltyWeight}</span> penalty, steering A* toward safer lanes.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">6. Informed Heuristic h(n)</div>
          <div className="font-mono text-sm font-semibold text-emerald-50">
            h(n) = |rₙ - r_g| + |cₙ - c_g|
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            Manhattan distance counts minimum 4-way grid steps to goal. Because every step costs <span className="font-mono text-emerald-100">≥ 1</span>, <span className="font-mono text-emerald-100">h(n) ≤ h*(n)</span> holds everywhere—guaranteeing admissibility and optimality for A*.
          </p>
        </div>
      </div>

      {/* Interactive State Transition & Cost Probe */}
      <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <h3 className="font-display text-lg font-semibold text-emerald-50">
              Interactive Transition & Cost Probe
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2 text-emerald-200">
              <span>Row (r):</span>
              <input
                type="number"
                min={0}
                max={rows - 1}
                value={probe.r}
                onChange={(e) =>
                  setProbe((p) => ({
                    ...p,
                    r: Math.max(0, Math.min(rows - 1, Number(e.target.value) || 0)),
                  }))
                }
                className="w-16 px-2 py-1 bg-[#0d1511] border border-emerald-800 rounded font-mono text-emerald-100 tabular-nums"
              />
            </label>
            <label className="flex items-center gap-2 text-emerald-200">
              <span>Col (c):</span>
              <input
                type="number"
                min={0}
                max={cols - 1}
                value={probe.c}
                onChange={(e) =>
                  setProbe((p) => ({
                    ...p,
                    c: Math.max(0, Math.min(cols - 1, Number(e.target.value) || 0)),
                  }))
                }
                className="w-16 px-2 py-1 bg-[#0d1511] border border-emerald-800 rounded font-mono text-emerald-100 tabular-nums"
              />
            </label>
            <button
              type="button"
              onClick={() => setProbe(start)}
              className="px-3 py-1.5 bg-[#1b2b22] hover:bg-[#23382c] text-emerald-100 rounded border border-emerald-800/70 cursor-pointer whitespace-nowrap"
            >
              Jump to Start
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
          <div className="lg:col-span-2 p-4 bg-[#0e1713] border border-emerald-900/50 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-400">Inspected State</div>
              <div className="font-mono text-xl font-bold text-amber-300 tabular-nums mt-0.5">
                s = ({probe.r}, {probe.c})
              </div>
              <div className="text-xs text-emerald-200/80 mt-1">
                Tile: <span className="font-medium text-emerald-100">{grid[probe.r][probe.c]}</span>
                {' · '}
                {probeNearProtected ? 'Adjacent to Protected Crop' : 'Clear of Protected Buffer'}
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-900/50 grid grid-cols-2 gap-3 font-mono text-xs tabular-nums">
              <div>
                <div className="text-emerald-400/75">Entry Cost</div>
                <div className="text-base font-semibold text-emerald-100">
                  {1 + probePenalty} {probePenalty > 0 ? `(1 + ${probePenalty})` : '(Base 1)'}
                </div>
              </div>
              <div>
                <div className="text-emerald-400/75">Heuristic h(s)</div>
                <div className="text-base font-semibold text-cyan-300">{probeH} steps</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map((act) => {
              const nr = probe.r + act.dr;
              const nc = probe.c + act.dc;
              const inBounds = nr >= 0 && nr < rows && nc >= 0 && nc < cols;
              const valid = inBounds && isPassable(grid[nr][nc], false);
              const nextPenalty = valid ? getStepPenalty(grid, nr, nc, penaltyWeight) : 0;
              const Icon = act.icon;

              return (
                <button
                  key={act.name}
                  type="button"
                  disabled={!inBounds}
                  onClick={() => valid && setProbe({ r: nr, c: nc })}
                  className={`p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 ${
                    valid
                      ? 'bg-[#0e1713] border-emerald-800/70 hover:border-amber-400/70 cursor-pointer'
                      : 'bg-[#0b120f] border-emerald-950/70 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#18261f] flex items-center justify-center text-emerald-200">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-display font-semibold text-sm text-emerald-100">
                        {act.name} → {inBounds ? `(${nr}, ${nc})` : 'Out of Bounds'}
                      </div>
                      <div className="text-xs text-emerald-400/80 font-mono tabular-nums">
                        {valid
                          ? `Cost: ${1 + nextPenalty} · h=${manhattan({ r: nr, c: nc }, goal)}`
                          : inBounds
                          ? `Blocked (${grid[nr][nc]})`
                          : 'Boundary wall'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      valid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {valid ? 'Move' : 'Blocked'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
