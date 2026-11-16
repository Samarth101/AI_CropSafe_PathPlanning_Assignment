export type CellType =
  | 'SAFE'
  | 'POTATO_ROW'
  | 'PROTECTED'
  | 'OBSTACLE'
  | 'UNKNOWN_OBSTACLE'
  | 'START'
  | 'GOAL';

export type AlgorithmId = 'BFS' | 'DFS' | 'GBFS' | 'ASTAR' | 'ASTAR_SAFE' | 'ASTAR_REPLAN';

export type PrimaryView = 'ARENA' | 'FORMULATION' | 'BENCHMARK' | 'SUBMISSION';

export type ArenaMode = 'SEARCH' | 'CROP_COMPARE' | 'REPLAN';

export type MissionId = 'TASK_1' | 'TASK_2' | 'TASK_3' | 'TASK_4' | 'TASK_5' | 'TASK_6';

export interface Coord {
  r: number;
  c: number;
}

export interface NodeCostInfo {
  g: number;
  h: number;
  f: number;
  penalty: number;
}

export interface SearchStep {
  current: Coord;
  frontier: Coord[];
  explored: Coord[];
  costs: Record<string, NodeCostInfo>;
  note: string;
}

export interface SearchResult {
  algorithm: AlgorithmId;
  label: string;
  path: Coord[];
  expandedNodes: number;
  pathLength: number;
  totalCost: number;
  riskSteps: number;
  executionTimeMs: number;
  reached: boolean;
  steps: SearchStep[];
  costsByKey: Record<string, NodeCostInfo>;
  replanCount?: number;
}

export interface ReplanEvent {
  frameIndex: number;
  robotPos: Coord;
  detectedObstacles: Coord[];
  replanNumber: number;
  message: string;
}

export interface OnlineFrame {
  robotPos: Coord;
  traveledPath: Coord[];
  activeRoute: Coord[];
  previousRoute: Coord[];
  discoveredKeys: string[];
  sensorKeys: string[];
  status: 'PLANNING' | 'MOVING' | 'DETECTED_REPLAN' | 'GOAL_REACHED' | 'NO_PATH';
  eventMessage: string;
  replanCount: number;
}

export interface OnlineRunResult {
  frames: OnlineFrame[];
  events: ReplanEvent[];
  summary: SearchResult;
  initialPath: Coord[];
}

export interface FieldPreset {
  id: string;
  name: string;
  subtitle: string;
  grid: CellType[][];
}

export interface TeamMember {
  id: number;
  name: string;
  rollNumber: string;
  roleTitle: string;
  tasksCovered: string;
}
