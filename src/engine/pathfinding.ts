import {
  AlgorithmId,
  CellType,
  Coord,
  NodeCostInfo,
  OnlineFrame,
  OnlineRunResult,
  ReplanEvent,
  SearchResult,
  SearchStep,
} from '../types/field';

const DIRS: { dr: number; dc: number; name: string }[] = [
  { dr: -1, dc: 0, name: 'Up' },
  { dr: 0, dc: 1, name: 'Right' },
  { dr: 1, dc: 0, name: 'Down' },
  { dr: 0, dc: -1, name: 'Left' },
];

export function coordKey(c: Coord): string {
  return `${c.r},${c.c}`;
}

export function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

export function findSpecialPositions(grid: CellType[][]): { start: Coord; goal: Coord } {
  let start: Coord = { r: 0, c: 0 };
  let goal: Coord = { r: grid.length - 1, c: (grid[0]?.length ?? 1) - 1 };

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === 'START') start = { r, c };
      if (grid[r][c] === 'GOAL') goal = { r, c };
    }
  }
  return { start, goal };
}

export function isPassable(cell: CellType, treatUnknownAsObstacle: boolean): boolean {
  if (cell === 'OBSTACLE' || cell === 'PROTECTED' || cell === 'POTATO_ROW') {
    return false;
  }
  if (treatUnknownAsObstacle && cell === 'UNKNOWN_OBSTACLE') {
    return false;
  }
  return true;
}

export function isNearProtectedCrop(grid: CellType[][], r: number, c: number): boolean {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (const d of DIRS) {
    const nr = r + d.dr;
    const nc = c + d.dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      if (grid[nr][nc] === 'PROTECTED') {
        return true;
      }
    }
  }
  return false;
}

export function getStepPenalty(grid: CellType[][], r: number, c: number, penaltyWeight: number): number {
  if (penaltyWeight <= 0) return 0;
  if (grid[r][c] === 'START' || grid[r][c] === 'GOAL') return 0;
  return isNearProtectedCrop(grid, r, c) ? penaltyWeight : 0;
}

function reconstructPath(parent: Map<string, Coord>, goal: Coord): Coord[] {
  const path: Coord[] = [];
  let curr: Coord | undefined = goal;
  while (curr) {
    path.push(curr);
    curr = parent.get(coordKey(curr));
  }
  return path.reverse();
}

function computePathStats(
  grid: CellType[][],
  path: Coord[],
  penaltyWeight: number
): { pathLength: number; totalCost: number; riskSteps: number } {
  if (path.length === 0) {
    return { pathLength: 0, totalCost: 0, riskSteps: 0 };
  }
  let totalCost = 0;
  let riskSteps = 0;
  for (let i = 1; i < path.length; i++) {
    const { r, c } = path[i];
    const penalty = getStepPenalty(grid, r, c, penaltyWeight);
    if (isNearProtectedCrop(grid, r, c)) {
      riskSteps += 1;
    }
    totalCost += 1 + penalty;
  }
  return {
    pathLength: path.length - 1,
    totalCost,
    riskSteps,
  };
}

interface SearchOptions {
  penaltyWeight: number;
  treatUnknownAsObstacle?: boolean;
  startOverride?: Coord;
  recordSteps?: boolean;
  labelOverride?: string;
}

function executeCoreSearch(
  grid: CellType[][],
  algorithm: AlgorithmId,
  options: SearchOptions
): Omit<SearchResult, 'executionTimeMs'> {
  const { start: gridStart, goal } = findSpecialPositions(grid);
  const start = options.startOverride ?? gridStart;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const treatUnknownAsObstacle = options.treatUnknownAsObstacle ?? false;
  const effectivePenalty =
    algorithm === 'ASTAR_SAFE' || algorithm === 'ASTAR' || algorithm === 'ASTAR_REPLAN'
      ? options.penaltyWeight
      : 0;
  const recordSteps = options.recordSteps ?? true;

  const parent = new Map<string, Coord>();
  const exploredOrder: Coord[] = [];
  const exploredSet = new Set<string>();
  const costsByKey: Record<string, NodeCostInfo> = {};
  const steps: SearchStep[] = [];

  const startKey = coordKey(start);
  const startH = manhattan(start, goal);
  costsByKey[startKey] = {
    g: 0,
    h: startH,
    f: algorithm === 'GBFS' ? startH : algorithm === 'ASTAR' || algorithm === 'ASTAR_SAFE' || algorithm === 'ASTAR_REPLAN' ? startH : 0,
    penalty: 0,
  };

  let reached = false;
  let seqCounter = 0;

  if (algorithm === 'BFS') {
    const queue: Coord[] = [start];
    const queued = new Set<string>([startKey]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const cKey = coordKey(current);
      if (exploredSet.has(cKey)) continue;
      exploredSet.add(cKey);
      exploredOrder.push(current);

      if (current.r === goal.r && current.c === goal.c) {
        reached = true;
        if (recordSteps) {
          steps.push({
            current,
            frontier: [...queue],
            explored: [...exploredOrder],
            costs: { ...costsByKey },
            note: `Goal reached at (${current.r}, ${current.c}) via BFS.`,
          });
        }
        break;
      }

      for (const dir of DIRS) {
        const nr = current.r + dir.dr;
        const nc = current.c + dir.dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (!isPassable(grid[nr][nc], treatUnknownAsObstacle)) continue;
        const nKey = `${nr},${nc}`;
        if (exploredSet.has(nKey) || queued.has(nKey)) continue;

        queued.add(nKey);
        parent.set(nKey, current);
        const g = (costsByKey[cKey]?.g ?? 0) + 1;
        const h = manhattan({ r: nr, c: nc }, goal);
        costsByKey[nKey] = { g, h, f: g, penalty: 0 };
        queue.push({ r: nr, c: nc });
      }

      if (recordSteps) {
        steps.push({
          current,
          frontier: [...queue],
          explored: [...exploredOrder],
          costs: { ...costsByKey },
          note: `BFS expanded (${current.r}, ${current.c}) · Frontier size ${queue.length}`,
        });
      }
    }
  } else if (algorithm === 'DFS') {
    const stack: Coord[] = [start];
    const inStackOrVisited = new Set<string>([startKey]);

    while (stack.length > 0) {
      const current = stack.pop()!;
      const cKey = coordKey(current);
      if (exploredSet.has(cKey)) continue;
      exploredSet.add(cKey);
      exploredOrder.push(current);

      if (current.r === goal.r && current.c === goal.c) {
        reached = true;
        if (recordSteps) {
          steps.push({
            current,
            frontier: [...stack],
            explored: [...exploredOrder],
            costs: { ...costsByKey },
            note: `Goal reached at (${current.r}, ${current.c}) via DFS.`,
          });
        }
        break;
      }

      // Push in reverse direction order so Up -> Right -> Down -> Left is popped first
      for (let i = DIRS.length - 1; i >= 0; i--) {
        const dir = DIRS[i];
        const nr = current.r + dir.dr;
        const nc = current.c + dir.dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (!isPassable(grid[nr][nc], treatUnknownAsObstacle)) continue;
        const nKey = `${nr},${nc}`;
        if (exploredSet.has(nKey) || inStackOrVisited.has(nKey)) continue;

        inStackOrVisited.add(nKey);
        parent.set(nKey, current);
        const g = (costsByKey[cKey]?.g ?? 0) + 1;
        const h = manhattan({ r: nr, c: nc }, goal);
        costsByKey[nKey] = { g, h, f: g, penalty: 0 };
        stack.push({ r: nr, c: nc });
      }

      if (recordSteps) {
        steps.push({
          current,
          frontier: [...stack],
          explored: [...exploredOrder],
          costs: { ...costsByKey },
          note: `DFS popped (${current.r}, ${current.c}) · Stack depth ${stack.length}`,
        });
      }
    }
  } else if (algorithm === 'GBFS') {
    const open: { coord: Coord; h: number; seq: number }[] = [
      { coord: start, h: startH, seq: seqCounter++ },
    ];
    const discovered = new Set<string>([startKey]);

    while (open.length > 0) {
      open.sort((a, b) => (a.h !== b.h ? a.h - b.h : a.seq - b.seq));
      const { coord: current } = open.shift()!;
      const cKey = coordKey(current);
      if (exploredSet.has(cKey)) continue;
      exploredSet.add(cKey);
      exploredOrder.push(current);

      if (current.r === goal.r && current.c === goal.c) {
        reached = true;
        if (recordSteps) {
          steps.push({
            current,
            frontier: open.map((o) => o.coord),
            explored: [...exploredOrder],
            costs: { ...costsByKey },
            note: `Goal reached at (${current.r}, ${current.c}) via Greedy Best-First.`,
          });
        }
        break;
      }

      for (const dir of DIRS) {
        const nr = current.r + dir.dr;
        const nc = current.c + dir.dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (!isPassable(grid[nr][nc], treatUnknownAsObstacle)) continue;
        const nKey = `${nr},${nc}`;
        if (exploredSet.has(nKey) || discovered.has(nKey)) continue;

        discovered.add(nKey);
        parent.set(nKey, current);
        const g = (costsByKey[cKey]?.g ?? 0) + 1;
        const h = manhattan({ r: nr, c: nc }, goal);
        costsByKey[nKey] = { g, h, f: h, penalty: 0 };
        open.push({ coord: { r: nr, c: nc }, h, seq: seqCounter++ });
      }

      if (recordSteps) {
        steps.push({
          current,
          frontier: open.map((o) => o.coord),
          explored: [...exploredOrder],
          costs: { ...costsByKey },
          note: `GBFS expanded (${current.r}, ${current.c}) · h=${costsByKey[cKey]?.h ?? 0}`,
        });
      }
    }
  } else {
    // A* Search (supports both standard penalty=0 and crop-safe penalty>0)
    const gScore = new Map<string, number>([[startKey, 0]]);
    const open: { coord: Coord; f: number; h: number; seq: number }[] = [
      { coord: start, f: startH, h: startH, seq: seqCounter++ },
    ];

    while (open.length > 0) {
      open.sort((a, b) => {
        if (a.f !== b.f) return a.f - b.f;
        if (a.h !== b.h) return a.h - b.h;
        return a.seq - b.seq;
      });
      const { coord: current } = open.shift()!;
      const cKey = coordKey(current);
      if (exploredSet.has(cKey)) continue;
      exploredSet.add(cKey);
      exploredOrder.push(current);

      if (current.r === goal.r && current.c === goal.c) {
        reached = true;
        if (recordSteps) {
          steps.push({
            current,
            frontier: open.map((o) => o.coord),
            explored: [...exploredOrder],
            costs: { ...costsByKey },
            note: `Goal reached at (${current.r}, ${current.c}) · Total g=${gScore.get(cKey) ?? 0}`,
          });
        }
        break;
      }

      const currG = gScore.get(cKey) ?? 0;

      for (const dir of DIRS) {
        const nr = current.r + dir.dr;
        const nc = current.c + dir.dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (!isPassable(grid[nr][nc], treatUnknownAsObstacle)) continue;
        const nKey = `${nr},${nc}`;
        if (exploredSet.has(nKey)) continue;

        const penalty = getStepPenalty(grid, nr, nc, effectivePenalty);
        const tentativeG = currG + 1 + penalty;
        const prevBestG = gScore.get(nKey);

        if (prevBestG === undefined || tentativeG < prevBestG) {
          gScore.set(nKey, tentativeG);
          parent.set(nKey, current);
          const h = manhattan({ r: nr, c: nc }, goal);
          const f = tentativeG + h;
          costsByKey[nKey] = { g: tentativeG, h, f, penalty };
          open.push({ coord: { r: nr, c: nc }, f, h, seq: seqCounter++ });
        }
      }

      if (recordSteps) {
        const info = costsByKey[cKey];
        steps.push({
          current,
          frontier: open.map((o) => o.coord),
          explored: [...exploredOrder],
          costs: { ...costsByKey },
          note: `A* expanded (${current.r}, ${current.c}) · g=${info?.g ?? 0} + h=${info?.h ?? 0} = f=${info?.f ?? 0}`,
        });
      }
    }
  }

  const path = reached ? reconstructPath(parent, goal) : [];
  const stats = computePathStats(grid, path, options.penaltyWeight);

  const labelMap: Record<AlgorithmId, string> = {
    BFS: 'Breadth-First Search (BFS)',
    DFS: 'Depth-First Search (DFS)',
    GBFS: 'Greedy Best-First Search',
    ASTAR: 'A* Search (Standard)',
    ASTAR_SAFE: 'A* Search (Crop-Safe)',
    ASTAR_REPLAN: 'Online A* Replanning',
  };

  return {
    algorithm,
    label: options.labelOverride ?? labelMap[algorithm],
    path,
    expandedNodes: exploredOrder.length,
    pathLength: stats.pathLength,
    totalCost: stats.totalCost,
    riskSteps: stats.riskSteps,
    reached,
    steps,
    costsByKey,
  };
}

export function runSearch(
  grid: CellType[][],
  algorithm: AlgorithmId,
  options: SearchOptions
): SearchResult {
  // Measure pure algorithmic runtime without snapshot cloning overhead
  const t0 = performance.now();
  executeCoreSearch(grid, algorithm, { ...options, recordSteps: false });
  const t1 = performance.now();
  const executionTimeMs = Math.max(0.01, Number((t1 - t0).toFixed(3)));

  const full = executeCoreSearch(grid, algorithm, { ...options, recordSteps: true });
  return {
    ...full,
    executionTimeMs,
  };
}

function getSensorCoords(rows: number, cols: number, center: Coord, radius: number): Coord[] {
  const coords: Coord[] = [];
  for (let r = Math.max(0, center.r - radius); r <= Math.min(rows - 1, center.r + radius); r++) {
    for (let c = Math.max(0, center.c - radius); c <= Math.min(cols - 1, center.c + radius); c++) {
      if (Math.abs(r - center.r) + Math.abs(c - center.c) <= radius) {
        coords.push({ r, c });
      }
    }
  }
  return coords;
}

export function runOnlineReplanning(
  trueGrid: CellType[][],
  penaltyWeight: number,
  sensorRadius = 2
): OnlineRunResult {
  const t0 = performance.now();
  const rows = trueGrid.length;
  const cols = trueGrid[0]?.length ?? 0;
  const { start, goal } = findSpecialPositions(trueGrid);

  // Known map initially treats UNKNOWN_OBSTACLE as SAFE
  const knownGrid: CellType[][] = trueGrid.map((row) =>
    row.map((cell) => (cell === 'UNKNOWN_OBSTACLE' ? 'SAFE' : cell))
  );

  let totalExpandedNodes = 0;
  let replanCount = 0;
  const discoveredSet = new Set<string>();
  const events: ReplanEvent[] = [];
  const frames: OnlineFrame[] = [];

  const initialSearch = executeCoreSearch(knownGrid, 'ASTAR_SAFE', {
    penaltyWeight,
    treatUnknownAsObstacle: true,
    startOverride: start,
    recordSteps: false,
  });
  totalExpandedNodes += initialSearch.expandedNodes;

  const initialPath = [...initialSearch.path];
  let currentRoute = [...initialSearch.path];
  let robotPos: Coord = start;
  const traveledPath: Coord[] = [start];

  const scanAndUpdate = (pos: Coord): Coord[] => {
    const sensorCells = getSensorCoords(rows, cols, pos, sensorRadius);
    const newlyFound: Coord[] = [];
    for (const sc of sensorCells) {
      if (trueGrid[sc.r][sc.c] === 'UNKNOWN_OBSTACLE') {
        const key = coordKey(sc);
        if (!discoveredSet.has(key)) {
          discoveredSet.add(key);
          knownGrid[sc.r][sc.c] = 'OBSTACLE';
          newlyFound.push(sc);
        }
      }
    }
    return newlyFound;
  };

  // Frame 0: Initial Plan
  const initialSensor = getSensorCoords(rows, cols, robotPos, sensorRadius).map(coordKey);
  frames.push({
    robotPos,
    traveledPath: [...traveledPath],
    activeRoute: [...currentRoute],
    previousRoute: [...currentRoute],
    discoveredKeys: Array.from(discoveredSet),
    sensorKeys: initialSensor,
    status: currentRoute.length > 0 ? 'PLANNING' : 'NO_PATH',
    eventMessage:
      currentRoute.length > 0
        ? `Initial A* plan computed (${currentRoute.length - 1} steps). Unknown obstacles hidden.`
        : 'No initial path available from Start to Goal.',
    replanCount: 0,
  });

  if (currentRoute.length === 0) {
    const t1 = performance.now();
    return {
      frames,
      events,
      initialPath,
      summary: {
        algorithm: 'ASTAR_REPLAN',
        label: 'Online A* Replanning',
        path: [],
        expandedNodes: totalExpandedNodes,
        pathLength: 0,
        totalCost: 0,
        riskSteps: 0,
        executionTimeMs: Math.max(0.01, Number((t1 - t0).toFixed(3))),
        reached: false,
        steps: [],
        costsByKey: {},
        replanCount: 0,
      },
    };
  }

  let safetyLoopGuard = 0;
  const maxSteps = rows * cols * 4;

  while (
    (robotPos.r !== goal.r || robotPos.c !== goal.c) &&
    safetyLoopGuard < maxSteps
  ) {
    safetyLoopGuard++;

    // Scan at current position
    const newlyFound = scanAndUpdate(robotPos);
    const sensorKeys = getSensorCoords(rows, cols, robotPos, sensorRadius).map(coordKey);

    // Check if remaining active route contains any discovered obstacle
    const remainingIdx = currentRoute.findIndex(
      (c) => c.r === robotPos.r && c.c === robotPos.c
    );
    const remainingSlice = remainingIdx >= 0 ? currentRoute.slice(remainingIdx) : currentRoute;
    const isRouteBlocked = remainingSlice.some((cell) => knownGrid[cell.r][cell.c] === 'OBSTACLE');

    if (newlyFound.length > 0 && isRouteBlocked) {
      replanCount += 1;
      const previousRoute = [...remainingSlice];
      const replanSearch = executeCoreSearch(knownGrid, 'ASTAR_SAFE', {
        penaltyWeight,
        treatUnknownAsObstacle: true,
        startOverride: robotPos,
        recordSteps: false,
      });
      totalExpandedNodes += replanSearch.expandedNodes;

      const detectedText = newlyFound.map((c) => `(${c.r}, ${c.c})`).join(', ');

      if (!replanSearch.reached || replanSearch.path.length === 0) {
        const msg = `Obstacle detected at ${detectedText}! Replan #${replanCount} found no valid detour.`;
        events.push({
          frameIndex: frames.length,
          robotPos,
          detectedObstacles: newlyFound,
          replanNumber: replanCount,
          message: msg,
        });
        frames.push({
          robotPos,
          traveledPath: [...traveledPath],
          activeRoute: [],
          previousRoute,
          discoveredKeys: Array.from(discoveredSet),
          sensorKeys,
          status: 'NO_PATH',
          eventMessage: msg,
          replanCount,
        });
        break;
      }

      currentRoute = [...replanSearch.path];
      const msg = `Obstacle detected at ${detectedText}! Known map updated -> A* Replan #${replanCount} (${currentRoute.length - 1} steps left).`;
      events.push({
        frameIndex: frames.length,
        robotPos,
        detectedObstacles: newlyFound,
        replanNumber: replanCount,
        message: msg,
      });
      frames.push({
        robotPos,
        traveledPath: [...traveledPath],
        activeRoute: [...currentRoute],
        previousRoute,
        discoveredKeys: Array.from(discoveredSet),
        sensorKeys,
        status: 'DETECTED_REPLAN',
        eventMessage: msg,
        replanCount,
      });
    } else if (newlyFound.length > 0) {
      // Detected off-route obstacle: still update known map and inform user
      const detectedText = newlyFound.map((c) => `(${c.r}, ${c.c})`).join(', ');
      frames.push({
        robotPos,
        traveledPath: [...traveledPath],
        activeRoute: [...remainingSlice],
        previousRoute: [...remainingSlice],
        discoveredKeys: Array.from(discoveredSet),
        sensorKeys,
        status: 'MOVING',
        eventMessage: `Scanned unknown obstacle at ${detectedText} off current route. Known map updated (no replan needed).`,
        replanCount,
      });
    }

    // Advance one step along currentRoute
    const idxNow = currentRoute.findIndex(
      (c) => c.r === robotPos.r && c.c === robotPos.c
    );
    const nextStep = idxNow >= 0 ? currentRoute[idxNow + 1] : currentRoute[1];
    if (!nextStep) break;

    // Double check if nextStep itself is blocked (if sensorRadius === 0 edge case)
    if (trueGrid[nextStep.r][nextStep.c] === 'UNKNOWN_OBSTACLE') {
      discoveredSet.add(coordKey(nextStep));
      knownGrid[nextStep.r][nextStep.c] = 'OBSTACLE';
      replanCount += 1;
      const previousRoute = currentRoute.slice(Math.max(0, idxNow));
      const replanSearch = executeCoreSearch(knownGrid, 'ASTAR_SAFE', {
        penaltyWeight,
        treatUnknownAsObstacle: true,
        startOverride: robotPos,
        recordSteps: false,
      });
      totalExpandedNodes += replanSearch.expandedNodes;
      if (!replanSearch.reached || replanSearch.path.length === 0) {
        frames.push({
          robotPos,
          traveledPath: [...traveledPath],
          activeRoute: [],
          previousRoute,
          discoveredKeys: Array.from(discoveredSet),
          sensorKeys,
          status: 'NO_PATH',
          eventMessage: `Blocked at (${nextStep.r}, ${nextStep.c})! No detour available.`,
          replanCount,
        });
        break;
      }
      currentRoute = [...replanSearch.path];
      const msg = `Adjacent obstacle detected at (${nextStep.r}, ${nextStep.c})! A* Replan #${replanCount} calculated.`;
      events.push({
        frameIndex: frames.length,
        robotPos,
        detectedObstacles: [nextStep],
        replanNumber: replanCount,
        message: msg,
      });
      frames.push({
        robotPos,
        traveledPath: [...traveledPath],
        activeRoute: [...currentRoute],
        previousRoute,
        discoveredKeys: Array.from(discoveredSet),
        sensorKeys,
        status: 'DETECTED_REPLAN',
        eventMessage: msg,
        replanCount,
      });
      continue;
    }

    robotPos = nextStep;
    traveledPath.push(robotPos);

    const isGoal = robotPos.r === goal.r && robotPos.c === goal.c;
    const postSensorKeys = getSensorCoords(rows, cols, robotPos, sensorRadius).map(coordKey);
    const nextIdx = currentRoute.findIndex((c) => c.r === robotPos.r && c.c === robotPos.c);

    frames.push({
      robotPos,
      traveledPath: [...traveledPath],
      activeRoute: nextIdx >= 0 ? currentRoute.slice(nextIdx) : [],
      previousRoute: [],
      discoveredKeys: Array.from(discoveredSet),
      sensorKeys: postSensorKeys,
      status: isGoal ? 'GOAL_REACHED' : 'MOVING',
      eventMessage: isGoal
        ? `Destination (${goal.r}, ${goal.c}) reached in ${traveledPath.length - 1} steps with ${replanCount} replan(s).`
        : `Rover moved to (${robotPos.r}, ${robotPos.c}). Scanning ${sensorRadius}-cell radius.`,
      replanCount,
    });
  }

  const t1 = performance.now();
  const reached = robotPos.r === goal.r && robotPos.c === goal.c;
  const stats = computePathStats(trueGrid, reached ? traveledPath : [], penaltyWeight);

  return {
    frames,
    events,
    initialPath,
    summary: {
      algorithm: 'ASTAR_REPLAN',
      label: 'Online A* Replanning',
      path: reached ? traveledPath : [],
      expandedNodes: totalExpandedNodes,
      pathLength: stats.pathLength,
      totalCost: stats.totalCost,
      riskSteps: stats.riskSteps,
      executionTimeMs: Math.max(0.01, Number((t1 - t0).toFixed(3))),
      reached,
      steps: [],
      costsByKey: {},
      replanCount,
    },
  };
}
