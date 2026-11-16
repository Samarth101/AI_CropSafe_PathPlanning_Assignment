"""
AI-Based Crop-Safe Path Planning for an Autonomous Potato-Field Robot
=====================================================================
Standalone Python implementation covering Tasks 1 to 6:
  Task 1: 2D Potato-Field Grid Environment & Visualization (NumPy + Matplotlib)
  Task 2: Problem Formulation (State, Actions, Transition, Goal Test, Cost & Heuristic)
  Task 3: Search Algorithms (BFS, DFS, Greedy Best-First Search, A* Search)
  Task 4: Crop-Safe Planning with Proximity Penalties near Protected Crop Beds
  Task 5: Online Unknown Obstacle Detection, Map Update, and A* Replanning
  Task 6: Performance Evaluation Comparison Table & Multi-Panel Plots

Dependencies:
  pip install numpy matplotlib
"""

from collections import deque
import heapq
import time
from typing import Dict, List, Optional, Set, Tuple

import matplotlib.patches as patches
import matplotlib.pyplot as plt
import numpy as np

# Grid Cell Encodings
SAFE = 0
POTATO_ROW = 1
PROTECTED = 2
OBSTACLE = 3
UNKNOWN_OBSTACLE = 4
START = 5
GOAL = 6

# 4-Directional Cardinal Actions: Up, Right, Down, Left
DIRS: List[Tuple[int, int]] = [(-1, 0), (0, 1), (1, 0), (0, -1)]
DIR_NAMES: List[str] = ["Up", "Right", "Down", "Left"]
Coord = Tuple[int, int]


# ---------------------------------------------------------------------------
# Task 1: Field Environment
# ---------------------------------------------------------------------------
def build_default_field() -> Tuple[np.ndarray, Coord, Coord]:
    """Construct a 12x16 2D potato-field grid with rows, protected beds, and obstacles."""
    layout = [
        "S..P......P....P",
        ".#.P.PPPP.P.PP.P",
        "...P......P....P",
        ".PP..CCCC..#PP..",
        ".....CCCC..?....",
        ".PPP.CCCC.PPPP..",
        ".....#..........",
        ".PPP?.PPP..PPP..",
        ".....P...P...P..",
        ".P...P.#.P...P.#",
        ".P.PPP...PPP.P..",
        ".......#....?..G",
    ]
    char_to_code = {
        ".": SAFE,
        "P": POTATO_ROW,
        "C": PROTECTED,
        "#": OBSTACLE,
        "?": UNKNOWN_OBSTACLE,
        "S": START,
        "G": GOAL,
    }
    grid = np.array([[char_to_code[ch] for ch in row] for row in layout], dtype=int)
    start = tuple(map(int, np.argwhere(grid == START)[0]))
    goal = tuple(map(int, np.argwhere(grid == GOAL)[0]))
    return grid, start, goal


def render_grid_on_axis(
    ax: plt.Axes,
    grid: np.ndarray,
    title: str,
    path: Optional[List[Coord]] = None,
    secondary_path: Optional[List[Coord]] = None,
    hide_unknown: bool = False,
) -> None:
    """Draw a 2D potato-field grid and optional path overlays onto a Matplotlib axis."""
    rows, cols = grid.shape
    color_map = {
        SAFE: "#26211c",
        POTATO_ROW: "#2f6b2f",
        PROTECTED: "#0f766e",
        OBSTACLE: "#475569",
        UNKNOWN_OBSTACLE: "#26211c" if hide_unknown else "#d97706",
        START: "#0ea5e9",
        GOAL: "#eab308",
    }

    for r in range(rows):
        for c in range(cols):
            code = int(grid[r, c])
            rect = patches.Rectangle(
                (c, rows - 1 - r),
                1,
                1,
                facecolor=color_map[code],
                edgecolor="#111827",
                linewidth=0.8,
            )
            ax.add_patch(rect)

            if code == PROTECTED:
                ax.text(
                    c + 0.5,
                    rows - 1 - r + 0.5,
                    "C",
                    ha="center",
                    va="center",
                    color="#ccfbf1",
                    fontsize=7,
                    fontweight="bold",
                )
            elif code == UNKNOWN_OBSTACLE and not hide_unknown:
                ax.text(
                    c + 0.5,
                    rows - 1 - r + 0.5,
                    "?",
                    ha="center",
                    va="center",
                    color="#fffbeb",
                    fontsize=8,
                    fontweight="bold",
                )

    if secondary_path and len(secondary_path) > 1:
        xs2 = [c + 0.5 for _, c in secondary_path]
        ys2 = [rows - 1 - r + 0.5 for r, _ in secondary_path]
        ax.plot(xs2, ys2, color="#fb7185", linewidth=2.0, linestyle="--", label="Initial / Standard")

    if path and len(path) > 1:
        xs = [c + 0.5 for _, c in path]
        ys = [rows - 1 - r + 0.5 for r, _ in path]
        ax.plot(xs, ys, color="#34d399", linewidth=2.6, marker="o", markersize=3, label="Final Path")

    ax.set_xlim(0, cols)
    ax.set_ylim(0, rows)
    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_title(title, fontsize=10, fontweight="bold")


# ---------------------------------------------------------------------------
# Task 2 & Task 4: Problem Formulation, Cost Function & Heuristic
# ---------------------------------------------------------------------------
def manhattan(a: Coord, b: Coord) -> int:
    """Admissible and consistent heuristic for 4-connected grids with step cost >= 1."""
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def is_passable(grid: np.ndarray, r: int, c: int, treat_unknown_as_obstacle: bool) -> bool:
    """Hard constraint: robot never enters obstacles, potato rows, or crop-protection cells."""
    rows, cols = grid.shape
    if not (0 <= r < rows and 0 <= c < cols):
        return False
    cell = int(grid[r, c])
    if cell in (OBSTACLE, PROTECTED, POTATO_ROW):
        return False
    if treat_unknown_as_obstacle and cell == UNKNOWN_OBSTACLE:
        return False
    return True


def is_near_protected(grid: np.ndarray, r: int, c: int) -> bool:
    """Return True if cell (r, c) is orthogonally adjacent to any Crop-Protection cell."""
    rows, cols = grid.shape
    for dr, dc in DIRS:
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols and int(grid[nr, nc]) == PROTECTED:
            return True
    return False


def step_cost(grid: np.ndarray, r: int, c: int, penalty_weight: int) -> int:
    """Task 4: Base movement cost = 1 plus safety penalty near protected crop regions."""
    if penalty_weight <= 0 or int(grid[r, c]) in (START, GOAL):
        return 1
    return 1 + (penalty_weight if is_near_protected(grid, r, c) else 0)


def count_risk_steps(grid: np.ndarray, path: List[Coord]) -> int:
    """Count how many cells entered along a path border a Crop-Protection cell."""
    return sum(1 for r, c in path[1:] if is_near_protected(grid, r, c))


def print_problem_formulation(grid: np.ndarray, start: Coord, goal: Coord, penalty_weight: int) -> None:
    """Task 2: Print formal state-space specification for the active field grid."""
    rows, cols = grid.shape
    print("\n=== TASK 2: PROBLEM FORMULATION ===")
    print(f"Grid Dimensions : {rows} rows x {cols} cols")
    print(f"Initial State   : s0 = {start}")
    print(f"Goal Test       : IsGoal(s) := (s == {goal})")
    print(f"Actions         : {DIR_NAMES} -> {DIRS}")
    print("Transition Model: Deterministic s' = (r + dr, c + dc) if in bounds and passable")
    print(f"Path-Cost Func  : c(s, a, s') = 1 + ({penalty_weight} if s' borders Protected else 0)")
    print(f"Heuristic h(n)  : Manhattan distance |r - {goal[0]}| + |c - {goal[1]}|, h(s0) = {manhattan(start, goal)}")


def reconstruct_path(parent: Dict[Coord, Coord], start: Coord, goal: Coord) -> List[Coord]:
    path: List[Coord] = []
    curr = goal
    while curr in parent or curr == start:
        path.append(curr)
        if curr == start:
            break
        curr = parent[curr]
    path.reverse()
    return path if path and path[0] == start else []


# ---------------------------------------------------------------------------
# Task 3: Search Algorithms (BFS, DFS, Greedy Best-First, A*)
# ---------------------------------------------------------------------------
def bfs(grid: np.ndarray, start: Coord, goal: Coord, penalty_weight: int = 5) -> dict:
    t0 = time.perf_counter()
    queue = deque([start])
    visited: Set[Coord] = {start}
    parent: Dict[Coord, Coord] = {}
    expanded = 0
    reached = False

    while queue:
        curr = queue.popleft()
        expanded += 1
        if curr == goal:
            reached = True
            break
        for dr, dc in DIRS:
            nxt = (curr[0] + dr, curr[1] + dc)
            if nxt not in visited and is_passable(grid, nxt[0], nxt[1], False):
                visited.add(nxt)
                parent[nxt] = curr
                queue.append(nxt)

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    path = reconstruct_path(parent, start, goal) if reached else []
    cost = sum(step_cost(grid, r, c, penalty_weight) for r, c in path[1:])
    return {
        "name": "BFS",
        "path": path,
        "length": max(0, len(path) - 1),
        "cost": cost,
        "risk_steps": count_risk_steps(grid, path) if reached else 0,
        "expanded": expanded,
        "time_ms": elapsed_ms,
        "reached": reached,
    }


def dfs(grid: np.ndarray, start: Coord, goal: Coord, penalty_weight: int = 5) -> dict:
    t0 = time.perf_counter()
    stack: List[Coord] = [start]
    visited: Set[Coord] = {start}
    parent: Dict[Coord, Coord] = {}
    expanded = 0
    reached = False

    while stack:
        curr = stack.pop()
        expanded += 1
        if curr == goal:
            reached = True
            break
        for dr, dc in reversed(DIRS):
            nxt = (curr[0] + dr, curr[1] + dc)
            if nxt not in visited and is_passable(grid, nxt[0], nxt[1], False):
                visited.add(nxt)
                parent[nxt] = curr
                stack.append(nxt)

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    path = reconstruct_path(parent, start, goal) if reached else []
    cost = sum(step_cost(grid, r, c, penalty_weight) for r, c in path[1:])
    return {
        "name": "DFS",
        "path": path,
        "length": max(0, len(path) - 1),
        "cost": cost,
        "risk_steps": count_risk_steps(grid, path) if reached else 0,
        "expanded": expanded,
        "time_ms": elapsed_ms,
        "reached": reached,
    }


def greedy_best_first(grid: np.ndarray, start: Coord, goal: Coord, penalty_weight: int = 5) -> dict:
    t0 = time.perf_counter()
    heap: List[Tuple[int, int, Coord]] = [(manhattan(start, goal), 0, start)]
    visited: Set[Coord] = {start}
    parent: Dict[Coord, Coord] = {}
    expanded = 0
    counter = 1
    reached = False

    while heap:
        _, _, curr = heapq.heappop(heap)
        expanded += 1
        if curr == goal:
            reached = True
            break
        for dr, dc in DIRS:
            nxt = (curr[0] + dr, curr[1] + dc)
            if nxt not in visited and is_passable(grid, nxt[0], nxt[1], False):
                visited.add(nxt)
                parent[nxt] = curr
                heapq.heappush(heap, (manhattan(nxt, goal), counter, nxt))
                counter += 1

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    path = reconstruct_path(parent, start, goal) if reached else []
    cost = sum(step_cost(grid, r, c, penalty_weight) for r, c in path[1:])
    return {
        "name": "Greedy Best-First",
        "path": path,
        "length": max(0, len(path) - 1),
        "cost": cost,
        "risk_steps": count_risk_steps(grid, path) if reached else 0,
        "expanded": expanded,
        "time_ms": elapsed_ms,
        "reached": reached,
    }


def a_star(
    grid: np.ndarray,
    start: Coord,
    goal: Coord,
    penalty_weight: int = 5,
    treat_unknown_as_obstacle: bool = False,
    label: str = "A* (Crop-Safe)",
) -> dict:
    t0 = time.perf_counter()
    g_score: Dict[Coord, int] = {start: 0}
    heap: List[Tuple[int, int, int, Coord]] = [(manhattan(start, goal), manhattan(start, goal), 0, start)]
    closed: Set[Coord] = set()
    parent: Dict[Coord, Coord] = {}
    expanded = 0
    counter = 1
    reached = False

    while heap:
        _, _, _, curr = heapq.heappop(heap)
        if curr in closed:
            continue
        closed.add(curr)
        expanded += 1
        if curr == goal:
            reached = True
            break
        for dr, dc in DIRS:
            nxt = (curr[0] + dr, curr[1] + dc)
            if nxt in closed or not is_passable(grid, nxt[0], nxt[1], treat_unknown_as_obstacle):
                continue
            tentative_g = g_score[curr] + step_cost(grid, nxt[0], nxt[1], penalty_weight)
            if nxt not in g_score or tentative_g < g_score[nxt]:
                g_score[nxt] = tentative_g
                parent[nxt] = curr
                h = manhattan(nxt, goal)
                heapq.heappush(heap, (tentative_g + h, h, counter, nxt))
                counter += 1

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    path = reconstruct_path(parent, start, goal) if reached else []
    return {
        "name": label,
        "path": path,
        "length": max(0, len(path) - 1),
        "cost": g_score.get(goal, 0) if reached else 0,
        "risk_steps": count_risk_steps(grid, path) if reached else 0,
        "expanded": expanded,
        "time_ms": elapsed_ms,
        "reached": reached,
    }


# ---------------------------------------------------------------------------
# Task 5: Unknown Obstacle Detection & Dynamic A* Replanning
# ---------------------------------------------------------------------------
def online_replanning_astar(
    true_grid: np.ndarray,
    start: Coord,
    goal: Coord,
    penalty_weight: int = 5,
    sensor_radius: int = 2,
    verbose: bool = True,
) -> dict:
    """
    Simulate an autonomous robot starting with no knowledge of UNKNOWN_OBSTACLE cells.
    Whenever an unknown obstacle enters Manhattan sensor_radius, the robot updates its
    known map and invokes A* to replan if its active route is blocked.
    """
    t0 = time.perf_counter()
    known_grid = true_grid.copy()
    known_grid[known_grid == UNKNOWN_OBSTACLE] = SAFE  # Hidden initially

    rows, cols = true_grid.shape
    initial = a_star(known_grid, start, goal, penalty_weight, True, "Initial A* Plan")
    initial_path = list(initial["path"])
    route = list(initial_path)
    total_expanded = initial["expanded"]
    replan_count = 0
    robot = start
    traveled: List[Coord] = [robot]

    if verbose:
        print("\n=== TASK 5: ONLINE OBSTACLE DETECTION & REPLANNING ===")
        print(f"Initial A* plan length: {initial['length']} steps (unknown obstacles hidden)")

    while robot != goal and route:
        newly_detected: List[Coord] = []
        for r in range(max(0, robot[0] - sensor_radius), min(rows, robot[0] + sensor_radius + 1)):
            for c in range(max(0, robot[1] - sensor_radius), min(cols, robot[1] + sensor_radius + 1)):
                if abs(r - robot[0]) + abs(c - robot[1]) <= sensor_radius:
                    if int(true_grid[r, c]) == UNKNOWN_OBSTACLE and int(known_grid[r, c]) != OBSTACLE:
                        known_grid[r, c] = OBSTACLE
                        newly_detected.append((r, c))

        idx = route.index(robot) if robot in route else 0
        remaining = route[idx:]

        if newly_detected and any(int(known_grid[r, c]) == OBSTACLE for r, c in remaining):
            replan_count += 1
            replan = a_star(known_grid, robot, goal, penalty_weight, True)
            total_expanded += replan["expanded"]
            if verbose:
                print(
                    f"  [Step {len(traveled)-1}] Rover at {robot} detected obstacle(s) {newly_detected} "
                    f"-> Replan #{replan_count}"
                )
            if not replan["reached"]:
                route = []
                break
            route = replan["path"]
            idx = 0

        if idx + 1 >= len(route):
            break
        robot = route[idx + 1]
        traveled.append(robot)

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    reached = robot == goal
    cost = sum(step_cost(true_grid, r, c, penalty_weight) for r, c in traveled[1:]) if reached else 0

    if verbose:
        print(f"Final outcome: reached={reached}, actual_steps={max(0, len(traveled)-1)}, replans={replan_count}")

    return {
        "name": "Online A* Replanning",
        "path": traveled if reached else [],
        "initial_path": initial_path,
        "length": max(0, len(traveled) - 1) if reached else 0,
        "cost": cost,
        "risk_steps": count_risk_steps(true_grid, traveled) if reached else 0,
        "expanded": total_expanded,
        "time_ms": elapsed_ms,
        "reached": reached,
        "replans": replan_count,
    }


# ---------------------------------------------------------------------------
# Task 6: Performance Evaluation & Visualization
# ---------------------------------------------------------------------------
def visualize_all_results(grid: np.ndarray, results: List[dict], online_res: dict) -> None:
    """Save 2x3 algorithm comparison figure and dedicated replanning trace figure."""
    fig, axes = plt.subplots(2, 3, figsize=(15, 9))
    for ax, res in zip(axes.flat, results):
        subtitle = f"{res['name']}\nLen: {res['length']} | Cost: {res['cost']} | Exp: {res['expanded']}"
        render_grid_on_axis(ax, grid, subtitle, path=res["path"])
    plt.tight_layout()
    plt.savefig("field_comparison.png", dpi=150)
    plt.close(fig)

    fig2, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    render_grid_on_axis(
        ax1,
        grid,
        "Before Discovery: Initial A* Plan",
        path=online_res["initial_path"],
        hide_unknown=True,
    )
    render_grid_on_axis(
        ax2,
        grid,
        f"After Detection: Online Replanned Path ({online_res['replans']} replans)",
        path=online_res["path"],
        secondary_path=online_res["initial_path"],
        hide_unknown=False,
    )
    ax2.legend(loc="lower left", fontsize=8)
    plt.tight_layout()
    plt.savefig("replanning_trace.png", dpi=150)
    plt.close(fig2)


def main() -> None:
    grid, start, goal = build_default_field()
    penalty_weight = 5

    print_problem_formulation(grid, start, goal, penalty_weight)

    res_bfs = bfs(grid, start, goal, penalty_weight)
    res_dfs = dfs(grid, start, goal, penalty_weight)
    res_gbfs = greedy_best_first(grid, start, goal, penalty_weight)
    res_astar_std = a_star(grid, start, goal, penalty_weight=0, label="A* (Standard)")
    res_astar_safe = a_star(grid, start, goal, penalty_weight=penalty_weight, label="A* (Crop-Safe)")
    res_online = online_replanning_astar(
        grid, start, goal, penalty_weight=penalty_weight, sensor_radius=2, verbose=True
    )

    all_results = [res_bfs, res_dfs, res_gbfs, res_astar_std, res_astar_safe, res_online]

    print("\n=== TASK 6: PERFORMANCE EVALUATION TABLE ===")
    header = (
        f"{'Algorithm':<22} {'Length':>8} {'Cost':>8} {'RiskSteps':>10} "
        f"{'Expanded':>10} {'Time(ms)':>10} {'Reached':>9} {'Replans':>8}"
    )
    print(header)
    print("-" * len(header))
    for r in all_results:
        replans = str(r.get("replans", "-"))
        print(
            f"{r['name']:<22} {r['length']:>8} {r['cost']:>8} {r['risk_steps']:>10} "
            f"{r['expanded']:>10} {r['time_ms']:>10.3f} {str(r['reached']):>9} {replans:>8}"
        )

    visualize_all_results(grid, all_results, res_online)
    print("\nSaved figures: field_comparison.png, replanning_trace.png")


if __name__ == "__main__":
    main()
