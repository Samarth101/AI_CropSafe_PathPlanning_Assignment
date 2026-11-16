import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlgorithmId,
  ArenaMode,
  CellType,
  MissionId,
  PrimaryView,
  SearchResult,
  TeamMember,
} from './types/field';
import { FIELD_PRESETS, cloneGrid } from './engine/presets';
import { runOnlineReplanning, runSearch } from './engine/pathfinding';
import { FieldCanvas } from './components/FieldCanvas';
import { MissionStrip } from './components/MissionStrip';
import { FormulationView } from './components/FormulationView';
import { BenchmarkView } from './components/BenchmarkView';
import { SubmissionView } from './components/SubmissionView';
import { soundFx } from './utils/sound';
import {
  FastForward,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: 1,
    name: '',
    rollNumber: '',
    roleTitle: 'Field Environment, Problem Formulation & Crop-Safe Cost',
    tasksCovered: 'Tasks 1, 2 & 4',
  },
  {
    id: 2,
    name: '',
    rollNumber: '',
    roleTitle: 'BFS, DFS, Greedy Best-First & Heuristic Design',
    tasksCovered: 'Task 3 (BFS/DFS/GBFS)',
  },
  {
    id: 3,
    name: '',
    rollNumber: '',
    roleTitle: 'A* Search, Online Replanning, Benchmarking & Docs',
    tasksCovered: 'Tasks 3 (A*), 5 & 6',
  },
];

const BRUSH_OPTIONS: { type: CellType; label: string; swatch: string }[] = [
  { type: 'SAFE', label: 'Safe Lane', swatch: 'bg-[#251f19] border-emerald-700/60' },
  { type: 'POTATO_ROW', label: 'Potato Row', swatch: 'bg-[#1e3a24] border-lime-500/60' },
  { type: 'PROTECTED', label: 'Protected Bed', swatch: 'bg-[#0d4a42] border-emerald-400/70' },
  { type: 'OBSTACLE', label: 'Obstacle', swatch: 'bg-[#334155] border-slate-400/70' },
  { type: 'UNKNOWN_OBSTACLE', label: 'Unknown ?', swatch: 'bg-[#3b2a1a] border-amber-400/80 border-dashed' },
  { type: 'START', label: 'Start Depot', swatch: 'bg-[#0c4a6e] border-sky-400/80' },
  { type: 'GOAL', label: 'Goal Station', swatch: 'bg-[#713f12] border-amber-400/90' },
];

export default function App() {
  const [primaryView, setPrimaryView] = useState<PrimaryView>('ARENA');
  const [arenaMode, setArenaMode] = useState<ArenaMode>('SEARCH');

  const [presetId, setPresetId] = useState<string>(FIELD_PRESETS[0].id);
  const [grid, setGrid] = useState<CellType[][]>(() => cloneGrid(FIELD_PRESETS[0].grid));
  const [activeBrush, setActiveBrush] = useState<CellType | null>('OBSTACLE');

  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmId>('ASTAR_SAFE');
  const [penaltyWeight, setPenaltyWeight] = useState<number>(5);
  const [sensorRadius, setSensorRadius] = useState<number>(2);

  const [searchStepIdx, setSearchStepIdx] = useState<number>(0);
  const [isSearchPlaying, setIsSearchPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [replanFrameIdx, setReplanFrameIdx] = useState<number>(0);
  const [isReplanPlaying, setIsReplanPlaying] = useState<boolean>(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);

  const [completedMissions, setCompletedMissions] = useState<Record<MissionId, boolean>>({
    TASK_1: true,
    TASK_2: false,
    TASK_3: false,
    TASK_4: false,
    TASK_5: false,
    TASK_6: false,
  });

  const markMission = useCallback((id: MissionId) => {
    setCompletedMissions((prev) => {
      if (prev[id]) return prev;
      soundFx.playMissionClear();
      return { ...prev, [id]: true };
    });
  }, []);

  const currentPreset = useMemo(
    () => FIELD_PRESETS.find((p) => p.id === presetId) ?? FIELD_PRESETS[0],
    [presetId]
  );

  // Compute active single search result (Task 3)
  const searchResult = useMemo(() => {
    const effectivePenalty = selectedAlgo === 'ASTAR_SAFE' ? penaltyWeight : 0;
    return runSearch(grid, selectedAlgo, {
      penaltyWeight: effectivePenalty,
      treatUnknownAsObstacle: false,
    });
  }, [grid, selectedAlgo, penaltyWeight]);

  // Compute Crop-Safe comparison pair (Task 4)
  const compareStandardResult = useMemo(
    () =>
      runSearch(grid, 'ASTAR', {
        penaltyWeight: 0,
        treatUnknownAsObstacle: false,
        labelOverride: 'A* Search (Standard)',
      }),
    [grid]
  );

  const compareSafeResult = useMemo(
    () =>
      runSearch(grid, 'ASTAR_SAFE', {
        penaltyWeight,
        treatUnknownAsObstacle: false,
        labelOverride: 'A* Search (Crop-Safe)',
      }),
    [grid, penaltyWeight]
  );

  // Compute Online Obstacle Detection & Replanning trace (Task 5)
  const onlineRun = useMemo(
    () => runOnlineReplanning(grid, penaltyWeight, sensorRadius),
    [grid, penaltyWeight, sensorRadius]
  );

  // Compute full benchmark suite (Task 6)
  const benchmarkResults: SearchResult[] = useMemo(() => {
    const bfsRes = runSearch(grid, 'BFS', { penaltyWeight });
    const dfsRes = runSearch(grid, 'DFS', { penaltyWeight });
    const gbfsRes = runSearch(grid, 'GBFS', { penaltyWeight });
    const astarStd = runSearch(grid, 'ASTAR', {
      penaltyWeight: 0,
      labelOverride: 'A* Search (Standard)',
    });
    const astarSafe = runSearch(grid, 'ASTAR_SAFE', {
      penaltyWeight,
      labelOverride: 'A* Search (Crop-Safe)',
    });
    return [bfsRes, dfsRes, gbfsRes, astarStd, astarSafe, onlineRun.summary];
  }, [grid, penaltyWeight, onlineRun]);

  // Keep step index clamped when grid or algo changes
  useEffect(() => {
    setIsSearchPlaying(false);
    setSearchStepIdx(Math.max(0, searchResult.steps.length - 1));
  }, [searchResult]);

  useEffect(() => {
    setIsReplanPlaying(false);
    setReplanFrameIdx(0);
  }, [onlineRun]);

  // Search playback timer
  useEffect(() => {
    if (!isSearchPlaying || arenaMode !== 'SEARCH') return;
    const maxIdx = Math.max(0, searchResult.steps.length - 1);
    const delayMs = playbackSpeed === 8 ? 35 : playbackSpeed === 3 ? 90 : 210;

    const timer = window.setInterval(() => {
      setSearchStepIdx((prev) => {
        if (prev >= maxIdx) {
          setIsSearchPlaying(false);
          if (searchResult.reached) {
            soundFx.playSuccess();
            markMission('TASK_3');
          }
          return maxIdx;
        }
        soundFx.playStep();
        return prev + 1;
      });
    }, delayMs);

    return () => window.clearInterval(timer);
  }, [isSearchPlaying, arenaMode, searchResult, playbackSpeed, markMission]);

  // Replan playback timer
  useEffect(() => {
    if (!isReplanPlaying || arenaMode !== 'REPLAN') return;
    const maxIdx = Math.max(0, onlineRun.frames.length - 1);
    const delayMs = playbackSpeed === 8 ? 90 : playbackSpeed === 3 ? 200 : 380;

    const timer = window.setInterval(() => {
      setReplanFrameIdx((prev) => {
        if (prev >= maxIdx) {
          setIsReplanPlaying(false);
          const finalFrame = onlineRun.frames[maxIdx];
          if (finalFrame?.status === 'GOAL_REACHED') {
            soundFx.playSuccess();
            markMission('TASK_5');
          }
          return maxIdx;
        }
        const nextIdx = prev + 1;
        const nextFrame = onlineRun.frames[nextIdx];
        if (nextFrame?.status === 'DETECTED_REPLAN') {
          soundFx.playAlert();
        } else {
          soundFx.playStep();
        }
        return nextIdx;
      });
    }, delayMs);

    return () => window.clearInterval(timer);
  }, [isReplanPlaying, arenaMode, onlineRun, playbackSpeed, markMission]);

  const handlePaintCell = (r: number, c: number) => {
    if (!activeBrush) return;
    setGrid((prev) => {
      const next = cloneGrid(prev);
      if (activeBrush === 'START' || activeBrush === 'GOAL') {
        // Ensure unique START and GOAL
        for (let rr = 0; rr < next.length; rr++) {
          for (let cc = 0; cc < next[rr].length; cc++) {
            if (next[rr][cc] === activeBrush) {
              next[rr][cc] = 'SAFE';
            }
          }
        }
      } else if (next[r][c] === 'START' || next[r][c] === 'GOAL') {
        // Protect START and GOAL from accidental overwrite
        return prev;
      }
      next[r][c] = activeBrush;
      return next;
    });
    markMission('TASK_1');
  };

  const handleLoadPreset = (id: string) => {
    const found = FIELD_PRESETS.find((p) => p.id === id);
    if (!found) return;
    setPresetId(id);
    setGrid(cloneGrid(found.grid));
    markMission('TASK_1');
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    soundFx.enabled = next;
    setSoundEnabled(next);
  };

  const handleSelectMission = (id: MissionId) => {
    if (id === 'TASK_1') {
      setPrimaryView('ARENA');
      setArenaMode('SEARCH');
    } else if (id === 'TASK_2') {
      setPrimaryView('FORMULATION');
    } else if (id === 'TASK_3') {
      setPrimaryView('ARENA');
      setArenaMode('SEARCH');
    } else if (id === 'TASK_4') {
      setPrimaryView('ARENA');
      setArenaMode('CROP_COMPARE');
      markMission('TASK_4');
    } else if (id === 'TASK_5') {
      setPrimaryView('ARENA');
      setArenaMode('REPLAN');
      if (presetId === 'protected-nursery') {
        handleLoadPreset('furrow-lanes');
      }
    } else if (id === 'TASK_6') {
      markMission('TASK_6');
      setPrimaryView('BENCHMARK');
    }
  };

  const handleRunFullBenchmark = () => {
    markMission('TASK_3');
    markMission('TASK_4');
    markMission('TASK_5');
    markMission('TASK_6');
    soundFx.playSuccess();
    setPrimaryView('BENCHMARK');
  };

  const currentSearchStep =
    arenaMode === 'SEARCH' && searchResult.steps.length > 0
      ? searchResult.steps[Math.min(searchStepIdx, searchResult.steps.length - 1)]
      : null;

  const isSearchAtEnd =
    searchResult.steps.length === 0 || searchStepIdx >= searchResult.steps.length - 1;

  const currentOnlineFrame =
    arenaMode === 'REPLAN' && onlineRun.frames.length > 0
      ? onlineRun.frames[Math.min(replanFrameIdx, onlineRun.frames.length - 1)]
      : null;

  return (
    <div className="min-h-screen bg-[#0d1511] text-[#edf2ee] flex flex-col">
      {/* Top Bar Contract: Single row, 3 clean zones separated by gap-8 */}
      <header className="border-b border-emerald-900/60 bg-[#0b120e]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element wordmark */}
          <button
            type="button"
            onClick={() => setPrimaryView('ARENA')}
            className="font-display text-xl font-bold tracking-tight text-emerald-50 whitespace-nowrap shrink-0 cursor-pointer hover:text-amber-300 transition-colors"
          >
            CropSafe Ops
          </button>

          {/* Zone 2: Clean single-line text nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {(
              [
                { id: 'ARENA', label: 'Field Arena' },
                { id: 'FORMULATION', label: 'Formulation' },
                { id: 'BENCHMARK', label: 'Benchmark' },
                { id: 'SUBMISSION', label: 'Team & Python' },
              ] as { id: PrimaryView; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPrimaryView(item.id);
                  if (item.id === 'FORMULATION') markMission('TASK_2');
                  if (item.id === 'BENCHMARK') markMission('TASK_6');
                }}
                className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  primaryView === item.id
                    ? 'text-amber-300 border-amber-400'
                    : 'text-emerald-200/75 border-transparent hover:text-emerald-50 hover:border-emerald-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 primary CTA button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleRunFullBenchmark}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-amber-400 text-[#0d1511] rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Run All Trials
            </button>
          </div>
        </div>

        {/* Mobile Nav Fallback */}
        <div className="md:hidden flex items-center gap-4 px-4 pb-2.5 overflow-x-auto text-xs font-medium">
          {(
            [
              { id: 'ARENA', label: 'Field Arena' },
              { id: 'FORMULATION', label: 'Formulation' },
              { id: 'BENCHMARK', label: 'Benchmark' },
              { id: 'SUBMISSION', label: 'Team & Python' },
            ] as { id: PrimaryView; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPrimaryView(item.id)}
              className={`whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                primaryView === item.id
                  ? 'text-amber-300 border-amber-400'
                  : 'text-emerald-300/75 border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        <MissionStrip completed={completedMissions} onSelectMission={handleSelectMission} />

        {primaryView === 'ARENA' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left/Center Interactive Stage */}
            <div className="lg:col-span-8 space-y-4">
              <FieldCanvas
                grid={grid}
                mode={arenaMode}
                activeBrush={activeBrush}
                onPaintCell={handlePaintCell}
                penaltyWeight={penaltyWeight}
                searchResult={searchResult}
                currentSearchStep={currentSearchStep}
                compareStandardResult={compareStandardResult}
                compareSafeResult={compareSafeResult}
                onlineFrame={currentOnlineFrame}
                showPathOverlay={isSearchAtEnd}
              />

              {/* Live Metrics & Event Readout Bar */}
              {arenaMode === 'SEARCH' && (
                <div className="p-4 bg-[#131e18] border border-emerald-900/60 rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs text-emerald-400">
                      {searchResult.label} · Step{' '}
                      <span className="font-mono tabular-nums">
                        {Math.min(searchStepIdx + 1, Math.max(1, searchResult.steps.length))} /{' '}
                        {Math.max(1, searchResult.steps.length)}
                      </span>
                    </div>
                    <div className="text-sm text-emerald-100 truncate">
                      {currentSearchStep?.note ??
                        (searchResult.reached
                          ? 'Path calculated.'
                          : 'Destination unreachable from Start.')}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-5 font-mono text-xs tabular-nums">
                    <div>
                      <div className="text-emerald-400/75">Length</div>
                      <div className="text-sm font-semibold text-emerald-50">
                        {searchResult.reached ? `${searchResult.pathLength} steps` : 'Blocked'}
                      </div>
                    </div>
                    <div>
                      <div className="text-emerald-400/75">Total Cost</div>
                      <div className="text-sm font-semibold text-amber-300">
                        {searchResult.reached ? searchResult.totalCost : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-emerald-400/75">Expanded</div>
                      <div className="text-sm font-semibold text-cyan-300">
                        {searchResult.expandedNodes}
                      </div>
                    </div>
                    <div>
                      <div className="text-emerald-400/75">Time</div>
                      <div className="text-sm font-semibold text-emerald-100">
                        {searchResult.executionTimeMs.toFixed(3)} ms
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {arenaMode === 'CROP_COMPARE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#131e18] border border-rose-500/35 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-rose-300 text-sm">
                        Standard A* (Penalty = 0)
                      </span>
                      <span className="font-mono text-xs text-rose-200/80 tabular-nums">
                        Dashed Coral Path
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-xs tabular-nums pt-1">
                      <div>
                        <div className="text-emerald-400/70">Steps</div>
                        <div className="text-sm font-semibold text-emerald-50">
                          {compareStandardResult.reached ? compareStandardResult.pathLength : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-emerald-400/70">Near-Crop</div>
                        <div className="text-sm font-semibold text-rose-300">
                          {compareStandardResult.riskSteps} cells
                        </div>
                      </div>
                      <div>
                        <div className="text-emerald-400/70">Expanded</div>
                        <div className="text-sm font-semibold text-emerald-100">
                          {compareStandardResult.expandedNodes}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#131e18] border border-emerald-500/45 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-emerald-300 text-sm">
                        Crop-Safe A* (Penalty = +{penaltyWeight})
                      </span>
                      <span className="font-mono text-xs text-emerald-200/80 tabular-nums">
                        Solid Emerald Path
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-xs tabular-nums pt-1">
                      <div>
                        <div className="text-emerald-400/70">Steps</div>
                        <div className="text-sm font-semibold text-emerald-50">
                          {compareSafeResult.reached ? compareSafeResult.pathLength : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-emerald-400/70">Near-Crop</div>
                        <div className="text-sm font-semibold text-emerald-300">
                          {compareSafeResult.riskSteps} cells
                        </div>
                      </div>
                      <div>
                        <div className="text-emerald-400/70">Total Cost</div>
                        <div className="text-sm font-semibold text-amber-300">
                          {compareSafeResult.totalCost}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {arenaMode === 'REPLAN' && (
                <div className="p-4 bg-[#131e18] border border-emerald-900/60 rounded-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="text-xs text-amber-300 font-medium">
                      Frame{' '}
                      <span className="font-mono tabular-nums">
                        {replanFrameIdx + 1} / {Math.max(1, onlineRun.frames.length)}
                      </span>
                      {' · '}
                      Status: {currentOnlineFrame?.status ?? 'READY'}
                    </div>
                    <div className="text-sm text-emerald-100">
                      {currentOnlineFrame?.eventMessage ?? 'Press Start Rover to run dynamic obstacle detection.'}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 font-mono text-xs tabular-nums shrink-0">
                    <div>
                      <div className="text-emerald-400/75">Replans</div>
                      <div className="text-sm font-semibold text-amber-300">
                        {currentOnlineFrame?.replanCount ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-emerald-400/75">Discovered</div>
                      <div className="text-sm font-semibold text-rose-300">
                        {currentOnlineFrame?.discoveredKeys.length ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-emerald-400/75">Final Steps</div>
                      <div className="text-sm font-semibold text-emerald-300">
                        {onlineRun.summary.reached ? onlineRun.summary.pathLength : 'Blocked'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Control Deck */}
            <aside className="lg:col-span-4 space-y-4">
              {/* Arena Mode Switch */}
              <div className="p-3 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-3">
                <div className="text-xs font-medium text-emerald-300">Simulation Mode</div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-[#0b120f] rounded-lg">
                  {(
                    [
                      { id: 'SEARCH', label: 'Search' },
                      { id: 'CROP_COMPARE', label: 'Crop-Safe' },
                      { id: 'REPLAN', label: 'Replan' },
                    ] as { id: ArenaMode; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setArenaMode(m.id);
                        setIsSearchPlaying(false);
                        setIsReplanPlaying(false);
                        if (m.id === 'CROP_COMPARE') markMission('TASK_4');
                      }}
                      className={`py-2 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        arenaMode === m.id
                          ? 'bg-amber-400 text-[#0d1511]'
                          : 'text-emerald-200/80 hover:text-emerald-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Mode 1 Controls: Search Algorithms (Task 3) */}
                {arenaMode === 'SEARCH' && (
                  <div className="space-y-3 pt-1">
                    <div className="text-xs font-medium text-emerald-300">
                      Algorithm (Task 3)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'BFS', label: 'BFS (Queue)' },
                          { id: 'DFS', label: 'DFS (Stack)' },
                          { id: 'GBFS', label: 'Greedy Best-First' },
                          { id: 'ASTAR_SAFE', label: 'A* (Crop-Safe)' },
                        ] as { id: AlgorithmId; label: string }[]
                      ).map((alg) => (
                        <button
                          key={alg.id}
                          type="button"
                          onClick={() => {
                            setSelectedAlgo(alg.id);
                            markMission('TASK_3');
                          }}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer whitespace-nowrap truncate ${
                            selectedAlgo === alg.id
                              ? 'bg-emerald-950/90 border-amber-400 text-amber-200'
                              : 'bg-[#0e1713] border-emerald-900/70 text-emerald-200/80 hover:border-emerald-700'
                          }`}
                        >
                          {alg.label}
                        </button>
                      ))}
                    </div>

                    {/* Step Playback Controls */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (isSearchPlaying) {
                            setIsSearchPlaying(false);
                          } else {
                            if (searchStepIdx >= searchResult.steps.length - 1) {
                              setSearchStepIdx(0);
                            }
                            setIsSearchPlaying(true);
                            markMission('TASK_3');
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500 text-[#0b120e] font-semibold text-xs rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {isSearchPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" /> Animate Search
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        title="Step Forward"
                        onClick={() => {
                          setIsSearchPlaying(false);
                          setSearchStepIdx((i) =>
                            Math.min(Math.max(0, searchResult.steps.length - 1), i + 1)
                          );
                          soundFx.playStep();
                          markMission('TASK_3');
                        }}
                        className="p-2 bg-[#0e1713] border border-emerald-800 rounded-lg text-emerald-200 hover:border-amber-400 cursor-pointer"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        title="Jump to Result"
                        onClick={() => {
                          setIsSearchPlaying(false);
                          setSearchStepIdx(Math.max(0, searchResult.steps.length - 1));
                          markMission('TASK_3');
                        }}
                        className="p-2 bg-[#0e1713] border border-emerald-800 rounded-lg text-emerald-200 hover:border-amber-400 cursor-pointer"
                      >
                        <FastForward className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        title="Reset Playback"
                        onClick={() => {
                          setIsSearchPlaying(false);
                          setSearchStepIdx(0);
                        }}
                        className="p-2 bg-[#0e1713] border border-emerald-800 rounded-lg text-emerald-200 hover:border-amber-400 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode 2 Controls: Crop-Safe Planning (Task 4) */}
                {arenaMode === 'CROP_COMPARE' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-200">
                        Crop-Protection Proximity Penalty
                      </span>
                      <span className="font-mono font-semibold text-amber-300 tabular-nums">
                        +{penaltyWeight} cost
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      step={1}
                      value={penaltyWeight}
                      onChange={(e) => {
                        setPenaltyWeight(Number(e.target.value));
                        markMission('TASK_4');
                      }}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <p className="text-xs text-emerald-300/80 leading-relaxed">
                      Cells adjacent to Protected Crop beds incur <span className="font-mono text-amber-200">+{penaltyWeight}</span> extra cost. Watch the solid emerald Crop-Safe A* route steer clear of sensitive beds while Standard A* (dashed coral) hugs the edge.
                    </p>
                  </div>
                )}

                {/* Mode 3 Controls: Online Obstacle Detection & Replanning (Task 5) */}
                {arenaMode === 'REPLAN' && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-emerald-200">
                        Rover Sensor Scan Radius
                      </span>
                      <span className="font-mono font-semibold text-amber-300 tabular-nums">
                        {sensorRadius} cells (Manhattan)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={1}
                      value={sensorRadius}
                      onChange={(e) => setSensorRadius(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isReplanPlaying) {
                            setIsReplanPlaying(false);
                          } else {
                            if (replanFrameIdx >= onlineRun.frames.length - 1) {
                              setReplanFrameIdx(0);
                            }
                            setIsReplanPlaying(true);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-400 text-[#0d1511] font-semibold text-xs rounded-lg hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {isReplanPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" /> Pause Rover
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" /> Start Rover Mission
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        title="Step Rover"
                        onClick={() => {
                          setIsReplanPlaying(false);
                          setReplanFrameIdx((i) => {
                            const next = Math.min(Math.max(0, onlineRun.frames.length - 1), i + 1);
                            if (onlineRun.frames[next]?.status === 'DETECTED_REPLAN') {
                              soundFx.playAlert();
                            } else if (onlineRun.frames[next]?.status === 'GOAL_REACHED') {
                              soundFx.playSuccess();
                              markMission('TASK_5');
                            } else {
                              soundFx.playStep();
                            }
                            return next;
                          });
                        }}
                        className="p-2 bg-[#0e1713] border border-emerald-800 rounded-lg text-emerald-200 hover:border-amber-400 cursor-pointer"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        title="Reset Rover"
                        onClick={() => {
                          setIsReplanPlaying(false);
                          setReplanFrameIdx(0);
                        }}
                        className="p-2 bg-[#0e1713] border border-emerald-800 rounded-lg text-emerald-200 hover:border-amber-400 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Event Log */}
                    <div className="p-2.5 bg-[#0b120f] border border-emerald-900/60 rounded-lg space-y-1.5 max-h-36 overflow-y-auto">
                      <div className="text-[11px] font-medium text-emerald-400">
                        Replanning Event Log ({onlineRun.events.length} triggered)
                      </div>
                      {onlineRun.events.length === 0 ? (
                        <div className="text-xs text-emerald-400/70">
                          No route-blocking unknown obstacles encountered on current layout. Paint an Unknown ? obstacle onto the initial route to test replanning!
                        </div>
                      ) : (
                        onlineRun.events.map((ev) => (
                          <div
                            key={ev.frameIndex}
                            className="text-xs text-amber-200/90 leading-snug border-t border-emerald-900/40 pt-1"
                          >
                            #{ev.replanNumber}: {ev.message}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Speed & Sound row */}
                <div className="flex items-center justify-between pt-2 border-t border-emerald-900/50 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400">Speed:</span>
                    {[1, 3, 8].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-1 rounded font-mono cursor-pointer ${
                          playbackSpeed === spd
                            ? 'bg-emerald-800 text-emerald-50'
                            : 'text-emerald-300/70 hover:text-emerald-100'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1713] border border-emerald-900/70 text-emerald-200 hover:border-emerald-700 cursor-pointer"
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Audio On
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-emerald-500" /> Muted
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Field Scenario Presets & Tile Brush Editor (Task 1) */}
              <div className="p-4 bg-[#131e18] border border-emerald-900/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-300">
                    Field Scenarios (Task 1)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(presetId)}
                    className="text-xs text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    Reset Map
                  </button>
                </div>

                <div className="space-y-1.5">
                  {FIELD_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleLoadPreset(p.id)}
                      className={`w-full px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                        presetId === p.id
                          ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-50'
                          : 'bg-[#0e1713] border-emerald-900/50 text-emerald-200/80 hover:border-emerald-700'
                      }`}
                    >
                      <div className="font-display font-semibold text-xs">{p.name}</div>
                      <div className="text-[11px] text-emerald-400/75 line-clamp-1">
                        {p.subtitle}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-emerald-900/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-emerald-300">Tile Paint Brush</span>
                    {activeBrush && (
                      <button
                        type="button"
                        onClick={() => setActiveBrush(null)}
                        className="text-emerald-400/80 hover:text-emerald-200 cursor-pointer"
                      >
                        Disable Brush
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BRUSH_OPTIONS.map((b) => (
                      <button
                        key={b.type}
                        type="button"
                        onClick={() => setActiveBrush((cur) => (cur === b.type ? null : b.type))}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer whitespace-nowrap ${
                          activeBrush === b.type
                            ? 'bg-emerald-950 border-amber-400 text-amber-200'
                            : 'bg-[#0e1713] border-emerald-900/60 text-emerald-200/80 hover:border-emerald-700'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-xs border shrink-0 ${b.swatch}`} />
                        <span className="truncate">{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {primaryView === 'FORMULATION' && (
          <FormulationView
            grid={grid}
            penaltyWeight={penaltyWeight}
            onAcknowledgeFormulation={() => {
              markMission('TASK_2');
              setPrimaryView('ARENA');
            }}
          />
        )}

        {primaryView === 'BENCHMARK' && (
          <BenchmarkView
            results={benchmarkResults}
            presetName={currentPreset.name}
            penaltyWeight={penaltyWeight}
            sensorRadius={sensorRadius}
            onRunBenchmark={handleRunFullBenchmark}
          />
        )}

        {primaryView === 'SUBMISSION' && (
          <SubmissionView
            members={members}
            onUpdateMember={(id, field, value) =>
              setMembers((prev) =>
                prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
              )
            }
            results={benchmarkResults}
            presetName={currentPreset.name}
            penaltyWeight={penaltyWeight}
          />
        )}
      </main>
    </div>
  );
}
