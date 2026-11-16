"""
field_rules.py
--------------
Defines the potato-field grid cell rules, 4-way movement directions,
Manhattan heuristic distance, and crop-safe buffer penalty calculations.
"""

from typing import Dict, List, Tuple

Grid = List[List[str]]
CoordTuple = Tuple[int, int]

# 4-directional cardinal movement: Up, Right, Down, Left
DIRS: List[Tuple[int, int, str]] = [
    (-1, 0, "Up"),
    (0, 1, "Right"),
    (1, 0, "Down"),
    (0, -1, "Left"),
]


def coord_key(r: int, c: int) -> str:
    return f"{r},{c}"


def coord_dict(r: int, c: int) -> Dict[str, int]:
    return {"r": r, "c": c}


def manhattan(r1: int, c1: int, r2: int, c2: int) -> int:
    """Grid distance (Up/Down/Left/Right) ignoring obstacles."""
    return abs(r1 - r2) + abs(c1 - c2)


def find_special_positions(grid: Grid) -> Tuple[CoordTuple, CoordTuple]:
    """Locate Start Depot (START) and Monitoring Station (GOAL) on the grid."""
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 1
    start: CoordTuple = (0, 0)
    goal: CoordTuple = (rows - 1, cols - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "START":
                start = (r, c)
            elif grid[r][c] == "GOAL":
                goal = (r, c)
    return start, goal


def is_passable(cell: str, treat_unknown_as_obstacle: bool = False) -> bool:
    """Return True if the robot can safely drive onto this cell."""
    if cell in ("OBSTACLE", "PROTECTED", "POTATO_ROW"):
        return False
    if treat_unknown_as_obstacle and cell == "UNKNOWN_OBSTACLE":
        return False
    return True


def is_near_protected_crop(grid: Grid, r: int, c: int) -> bool:
    """Return True if cell (r, c) is right next to any Crop-Protection bed."""
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0
    for dr, dc, _ in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols:
            if grid[nr][nc] == "PROTECTED":
                return True
    return False


def get_step_penalty(grid: Grid, r: int, c: int, penalty_weight: int) -> int:
    """Extra cost for driving right next to a protected crop bed."""
    if penalty_weight <= 0:
        return 0
    if grid[r][c] in ("START", "GOAL"):
        return 0
    return penalty_weight if is_near_protected_crop(grid, r, c) else 0


def reconstruct_path(parent: Dict[CoordTuple, CoordTuple], start: CoordTuple, goal: CoordTuple) -> List[CoordTuple]:
    """Trace backward from goal to start using parent pointers."""
    path: List[CoordTuple] = []
    curr: CoordTuple = goal
    while curr in parent or curr == start:
        path.append(curr)
        if curr == start:
            break
        curr = parent[curr]
    path.reverse()
    return path if path and path[0] == start else []


def compute_path_stats(grid: Grid, path: List[CoordTuple], penalty_weight: int) -> Dict[str, int]:
    """Measure step count, total crop-safe cost, and near-crop risk steps."""
    if not path:
        return {"pathLength": 0, "totalCost": 0, "riskSteps": 0}

    total_cost = 0
    risk_steps = 0
    for r, c in path[1:]:
        penalty = get_step_penalty(grid, r, c, penalty_weight)
        if is_near_protected_crop(grid, r, c):
            risk_steps += 1
        total_cost += 1 + penalty

    return {
        "pathLength": len(path) - 1,
        "totalCost": total_cost,
        "riskSteps": risk_steps,
    }
