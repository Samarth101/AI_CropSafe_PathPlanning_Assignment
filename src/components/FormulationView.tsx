import React, { useState } from 'react';
import { CellType, Coord } from '../types/field';
import {
  findSpecialPositions,
  getStepPenalty,
  isNearProtectedCrop,
  isPassable,
  manhattan,
} from '../utils/gridHelpers';
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
    { name: 'Move Up', dr: -1, dc: 0, icon: ArrowUp },
    { name: 'Move Right', dr: 0, dc: 1, icon: ArrowRight },
    { name: 'Move Down', dr: 1, dc: 0, icon: ArrowDown },
    { name: 'Move Left', dr: 0, dc: -1, icon: ArrowLeft },
  ];

  const probeH = manhattan(probe, goal);
  const probeNearProtected = isNearProtectedCrop(grid, probe.r, probe.c);
  const probePenalty = getStepPenalty(grid, probe.r, probe.c, penaltyWeight);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-emerald-50">
            Task 2: How the Robot Thinks &amp; Plans
          </h2>
          <p className="mt-1 text-sm text-emerald-200/80 max-w-3xl">
            Before searching for a path, an AI robot needs clear rules: where it starts, which directions it can drive, what happens after each move, and how it scores safe vs. risky routes.
          </p>
        </div>
        <button
          type="button"
          onClick={onAcknowledgeFormulation}
          className="px-4 py-2 text-sm font-medium bg-amber-400 text-[#0d1511] rounded-lg hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Got It, Mark Complete
        </button>
      </div>

      {/* 6 Plain-English Formulation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">1. Starting Position</div>
          <div className="text-lg font-semibold text-emerald-50 tabular-nums">
            Row {start.r}, Column {start.c}
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            The robot begins at the blue Start tile on our <span className="text-emerald-100">{rows} × {cols}</span> potato field. Every spot on the map is written as a <span className="text-emerald-100">(row, column)</span> pair.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">2. Allowed Moves (Actions)</div>
          <div className="text-base font-semibold text-emerald-50">
            Up, Right, Down, or Left
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            The robot moves one square at a time along the dirt lanes between crop rows. Diagonal shortcuts are blocked so it never clips potato plants.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">3. Where Each Move Lands</div>
          <div className="text-base font-semibold text-emerald-50">
            One clean step if the tile is open
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            Every move is predictable: choosing &ldquo;Right&rdquo; always shifts 1 column right—unless that tile is outside the map, a rock, a potato plant, or a protected seedling bed.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">4. Goal Check</div>
          <div className="text-lg font-semibold text-emerald-50 tabular-nums">
            Reached Row {goal.r}, Column {goal.c}?
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            The mission succeeds the moment the robot steps onto the gold Destination flag at <span className="text-emerald-100">({goal.r}, {goal.c})</span>.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">5. Path Cost (Crop Safety)</div>
          <div className="text-base font-semibold text-emerald-50 tabular-nums">
            Step Cost = 1 + Safety Penalty
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            A normal lane costs <span className="text-emerald-100">1</span> point. Stepping right next to a protected seedling bed adds <span className="text-amber-300">+{penaltyWeight}</span> extra points, nudging A* into safer lanes.
          </p>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-2">
          <div className="text-xs font-medium text-amber-300">6. Smart Guess (Heuristic)</div>
          <div className="text-base font-semibold text-emerald-50">
            Manhattan Distance: |ΔRow| + |ΔCol|
          </div>
          <p className="text-sm text-emerald-200/80 leading-relaxed">
            Greedy Search and A* count how many straight grid steps remain to the goal. Since it never overestimates the true cost, A* is guaranteed to find the cheapest safe route.
          </p>
        </div>
      </div>

      {/* Interactive Tile Tester */}
      <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <h3 className="font-display text-lg font-bold text-emerald-50">
              Try Moving Around a Tile Yourself
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2 text-emerald-200">
              <span>Row:</span>
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
                className="w-16 px-2 py-1 bg-[#0d1511] border border-emerald-800 rounded text-emerald-100 tabular-nums"
              />
            </label>
            <label className="flex items-center gap-2 text-emerald-200">
              <span>Column:</span>
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
                className="w-16 px-2 py-1 bg-[#0d1511] border border-emerald-800 rounded text-emerald-100 tabular-nums"
              />
            </label>
            <button
              type="button"
              onClick={() => setProbe(start)}
              className="px-3 py-1.5 bg-[#1b2b22] hover:bg-[#23382c] text-emerald-100 rounded border border-emerald-800/70 cursor-pointer whitespace-nowrap"
            >
              Reset to Start
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
          <div className="lg:col-span-2 p-4 bg-[#0e1713] border border-emerald-900/50 rounded-xl flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-400">Robot Standing At</div>
              <div className="text-xl font-bold text-amber-300 tabular-nums mt-0.5">
                Row {probe.r}, Col {probe.c}
              </div>
              <div className="text-xs text-emerald-200/80 mt-1">
                Tile type: <span className="font-medium text-emerald-100">{grid[probe.r][probe.c]}</span>
                {' · '}
                {probeNearProtected ? 'Next to protected seedlings' : 'Safe distance from seedlings'}
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-900/50 grid grid-cols-2 gap-3 text-xs tabular-nums">
              <div>
                <div className="text-emerald-400/75">Cost to Enter Here</div>
                <div className="text-base font-semibold text-emerald-100">
                  {1 + probePenalty} {probePenalty > 0 ? `(1 + ${probePenalty} penalty)` : '(normal 1)'}
                </div>
              </div>
              <div>
                <div className="text-emerald-400/75">Est. Steps to Goal</div>
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
                      <div className="font-display font-bold text-sm text-emerald-100">
                        {act.name} → {inBounds ? `(${nr}, ${nc})` : 'Edge of Map'}
                      </div>
                      <div className="text-xs text-emerald-400/80 tabular-nums">
                        {valid
                          ? `Cost: ${1 + nextPenalty} · ${manhattan({ r: nr, c: nc }, goal)} steps from goal`
                          : inBounds
                          ? `Blocked (${grid[nr][nc]})`
                          : 'Cannot leave the field'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      valid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {valid ? 'Step Here' : 'Blocked'}
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
