import { CellType, Coord } from '../types/field';

const DIRS = [
  { dr: -1, dc: 0 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
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
