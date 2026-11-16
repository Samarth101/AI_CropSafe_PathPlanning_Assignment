"""
search_algorithms.py
--------------------
Pure Python implementations of all 4 required search algorithms:
  1. Breadth-First Search (BFS)
  2. Depth-First Search (DFS)
  3. Greedy Best-First Search (GBFS)
  4. A* Search (Standard and Crop-Safe)

Produces both pure execution timing and step-by-step animation frames
for the interactive web visualizer.
"""

from collections import deque
import heapq
import time
from typing import Any, Dict, List, Optional, Set, Tuple

from .field_rules import (
    CoordTuple,
    DIRS,
    Grid,
    compute_path_stats,
    coord_dict,
    coord_key,
    find_special_positions,
    get_step_penalty,
    is_passable,
    manhattan,
    reconstruct_path,
)

LABEL_MAP: Dict[str, str] = {
    "BFS": "Breadth-First Search (BFS)",
    "DFS": "Depth-First Search (DFS)",
    "GBFS": "Greedy Best-First Search",
    "ASTAR": "A* Search (Standard)",
    "ASTAR_SAFE": "A* Search (Crop-Safe)",
    "ASTAR_REPLAN": "Online A* Replanning",
}


def _execute_core_search(
    grid: Grid,
    algorithm: str,
    penalty_weight: int,
    treat_unknown_as_obstacle: bool = False,
    start_override: Optional[CoordTuple] = None,
    record_steps: bool = True,
    label_override: Optional[str] = None,
) -> Dict[str, Any]:
    grid_start, goal = find_special_positions(grid)
    start = start_override if start_override is not None else grid_start
    rows = len(grid)
    cols = len(grid[0]) if rows > 0 else 0

    effective_penalty = (
        penalty_weight if algorithm in ("ASTAR", "ASTAR_SAFE", "ASTAR_REPLAN") else 0
    )

    parent: Dict[CoordTuple, CoordTuple] = {}
    explored_order: List[CoordTuple] = []
    explored_set: Set[CoordTuple] = set()
    costs_by_key: Dict[str, Dict[str, int]] = {}
    steps: List[Dict[str, Any]] = []

    start_h = manhattan(start[0], start[1], goal[0], goal[1])
    start_f = (
        start_h
        if algorithm in ("GBFS", "ASTAR", "ASTAR_SAFE", "ASTAR_REPLAN")
        else 0
    )
    costs_by_key[coord_key(start[0], start[1])] = {
        "g": 0,
        "h": start_h,
        "f": start_f,
        "penalty": 0,
    }

    reached = False
    seq_counter = 0

    if algorithm == "BFS":
        queue = deque([start])
        queued: Set[CoordTuple] = {start}

        while queue:
            curr = queue.popleft()
            if curr in explored_set:
                continue
            explored_set.add(curr)
            explored_order.append(curr)
            c_key = coord_key(curr[0], curr[1])

            if curr == goal:
                reached = True
                if record_steps:
                    steps.append({
                        "current": coord_dict(curr[0], curr[1]),
                        "frontier": [coord_dict(r, c) for r, c in queue],
                        "explored": [coord_dict(r, c) for r, c in explored_order],
                        "costs": dict(costs_by_key),
                        "note": f"Reached the goal at ({curr[0]}, {curr[1]}) using BFS.",
                    })
                break

            for dr, dc, _ in DIRS:
                nr, nc = curr[0] + dr, curr[1] + dc
                nxt = (nr, nc)
                if not (0 <= nr < rows and 0 <= nc < cols):
                    continue
                if not is_passable(grid[nr][nc], treat_unknown_as_obstacle):
                    continue
                if nxt in explored_set or nxt in queued:
                    continue

                queued.add(nxt)
                parent[nxt] = curr
                g_val = costs_by_key[c_key]["g"] + 1
                h_val = manhattan(nr, nc, goal[0], goal[1])
                costs_by_key[coord_key(nr, nc)] = {
                    "g": g_val,
                    "h": h_val,
                    "f": g_val,
                    "penalty": 0,
                }
                queue.append(nxt)

            if record_steps:
                steps.append({
                    "current": coord_dict(curr[0], curr[1]),
                    "frontier": [coord_dict(r, c) for r, c in queue],
                    "explored": [coord_dict(r, c) for r, c in explored_order],
                    "costs": dict(costs_by_key),
                    "note": f"BFS checked tile ({curr[0]}, {curr[1]}) · {len(queue)} waiting in queue",
                })

    elif algorithm == "DFS":
        stack: List[CoordTuple] = [start]
        in_stack_or_visited: Set[CoordTuple] = {start}

        while stack:
            curr = stack.pop()
            if curr in explored_set:
                continue
            explored_set.add(curr)
            explored_order.append(curr)
            c_key = coord_key(curr[0], curr[1])

            if curr == goal:
                reached = True
                if record_steps:
                    steps.append({
                        "current": coord_dict(curr[0], curr[1]),
                        "frontier": [coord_dict(r, c) for r, c in stack],
                        "explored": [coord_dict(r, c) for r, c in explored_order],
                        "costs": dict(costs_by_key),
                        "note": f"Reached the goal at ({curr[0]}, {curr[1]}) using DFS.",
                    })
                break

            for dr, dc, _ in reversed(DIRS):
                nr, nc = curr[0] + dr, curr[1] + dc
                nxt = (nr, nc)
                if not (0 <= nr < rows and 0 <= nc < cols):
                    continue
                if not is_passable(grid[nr][nc], treat_unknown_as_obstacle):
                    continue
                if nxt in explored_set or nxt in in_stack_or_visited:
                    continue

                in_stack_or_visited.add(nxt)
                parent[nxt] = curr
                g_val = costs_by_key[c_key]["g"] + 1
                h_val = manhattan(nr, nc, goal[0], goal[1])
                costs_by_key[coord_key(nr, nc)] = {
                    "g": g_val,
                    "h": h_val,
                    "f": g_val,
                    "penalty": 0,
                }
                stack.append(nxt)

            if record_steps:
                steps.append({
                    "current": coord_dict(curr[0], curr[1]),
                    "frontier": [coord_dict(r, c) for r, c in stack],
                    "explored": [coord_dict(r, c) for r, c in explored_order],
                    "costs": dict(costs_by_key),
                    "note": f"DFS explored tile ({curr[0]}, {curr[1]}) · {len(stack)} branches on stack",
                })

    elif algorithm == "GBFS":
        open_heap: List[Tuple[int, int, CoordTuple]] = [(start_h, seq_counter, start)]
        seq_counter += 1
        discovered: Set[CoordTuple] = {start}

        while open_heap:
            _, _, curr = heapq.heappop(open_heap)
            if curr in explored_set:
                continue
            explored_set.add(curr)
            explored_order.append(curr)
            c_key = coord_key(curr[0], curr[1])

            if curr == goal:
                reached = True
                if record_steps:
                    steps.append({
                        "current": coord_dict(curr[0], curr[1]),
                        "frontier": [coord_dict(item[2][0], item[2][1]) for item in open_heap],
                        "explored": [coord_dict(r, c) for r, c in explored_order],
                        "costs": dict(costs_by_key),
                        "note": f"Reached the goal at ({curr[0]}, {curr[1]}) using Greedy Best-First.",
                    })
                break

            for dr, dc, _ in DIRS:
                nr, nc = curr[0] + dr, curr[1] + dc
                nxt = (nr, nc)
                if not (0 <= nr < rows and 0 <= nc < cols):
                    continue
                if not is_passable(grid[nr][nc], treat_unknown_as_obstacle):
                    continue
                if nxt in explored_set or nxt in discovered:
                    continue

                discovered.add(nxt)
                parent[nxt] = curr
                g_val = costs_by_key[c_key]["g"] + 1
                h_val = manhattan(nr, nc, goal[0], goal[1])
                costs_by_key[coord_key(nr, nc)] = {
                    "g": g_val,
                    "h": h_val,
                    "f": h_val,
                    "penalty": 0,
                }
                heapq.heappush(open_heap, (h_val, seq_counter, nxt))
                seq_counter += 1

            if record_steps:
                steps.append({
                    "current": coord_dict(curr[0], curr[1]),
                    "frontier": [coord_dict(item[2][0], item[2][1]) for item in open_heap],
                    "explored": [coord_dict(r, c) for r, c in explored_order],
                    "costs": dict(costs_by_key),
                    "note": f"Greedy picked ({curr[0]}, {curr[1]}) because it is {costs_by_key[c_key]['h']} steps away",
                })

    else:
        # A* Search (supports penalty=0 for Standard and penalty>0 for Crop-Safe)
        g_score: Dict[CoordTuple, int] = {start: 0}
        open_heap_astar: List[Tuple[int, int, int, CoordTuple]] = [
            (start_h, start_h, seq_counter, start)
        ]
        seq_counter += 1

        while open_heap_astar:
            _, _, _, curr = heapq.heappop(open_heap_astar)
            if curr in explored_set:
                continue
            explored_set.add(curr)
            explored_order.append(curr)
            c_key = coord_key(curr[0], curr[1])

            if curr == goal:
                reached = True
                if record_steps:
                    steps.append({
                        "current": coord_dict(curr[0], curr[1]),
                        "frontier": [coord_dict(item[3][0], item[3][1]) for item in open_heap_astar],
                        "explored": [coord_dict(r, c) for r, c in explored_order],
                        "costs": dict(costs_by_key),
                        "note": f"Reached the goal at ({curr[0]}, {curr[1]}) · Total path cost {g_score[curr]}.",
                    })
                break

            curr_g = g_score[curr]

            for dr, dc, _ in DIRS:
                nr, nc = curr[0] + dr, curr[1] + dc
                nxt = (nr, nc)
                if not (0 <= nr < rows and 0 <= nc < cols):
                    continue
                if not is_passable(grid[nr][nc], treat_unknown_as_obstacle):
                    continue
                if nxt in explored_set:
                    continue

                penalty = get_step_penalty(grid, nr, nc, effective_penalty)
                tentative_g = curr_g + 1 + penalty
                prev_best = g_score.get(nxt)

                if prev_best is None or tentative_g < prev_best:
                    g_score[nxt] = tentative_g
                    parent[nxt] = curr
                    h_val = manhattan(nr, nc, goal[0], goal[1])
                    f_val = tentative_g + h_val
                    costs_by_key[coord_key(nr, nc)] = {
                        "g": tentative_g,
                        "h": h_val,
                        "f": f_val,
                        "penalty": penalty,
                    }
                    heapq.heappush(open_heap_astar, (f_val, h_val, seq_counter, nxt))
                    seq_counter += 1

            if record_steps:
                info = costs_by_key[c_key]
                steps.append({
                    "current": coord_dict(curr[0], curr[1]),
                    "frontier": [coord_dict(item[3][0], item[3][1]) for item in open_heap_astar],
                    "explored": [coord_dict(r, c) for r, c in explored_order],
                    "costs": dict(costs_by_key),
                    "note": (
                        f"A* checked ({curr[0]}, {curr[1]}) · "
                        f"Cost so far={info['g']}, Est. left={info['h']}, Score={info['f']}"
                    ),
                })

    path = reconstruct_path(parent, start, goal) if reached else []
    stats = compute_path_stats(grid, path, penalty_weight)

    return {
        "algorithm": algorithm,
        "label": label_override or LABEL_MAP.get(algorithm, algorithm),
        "path": [coord_dict(r, c) for r, c in path],
        "expandedNodes": len(explored_order),
        "pathLength": stats["pathLength"],
        "totalCost": stats["totalCost"],
        "riskSteps": stats["riskSteps"],
        "reached": reached,
        "steps": steps,
        "costsByKey": costs_by_key,
    }


def run_search(
    grid: Grid,
    algorithm: str,
    penalty_weight: int = 5,
    treat_unknown_as_obstacle: bool = False,
    start_override: Optional[CoordTuple] = None,
    label_override: Optional[str] = None,
) -> Dict[str, Any]:
    """Measure pure Python runtime without snapshot overhead, then capture full step frames."""
    t0 = time.perf_counter()
    _execute_core_search(
        grid=grid,
        algorithm=algorithm,
        penalty_weight=penalty_weight,
        treat_unknown_as_obstacle=treat_unknown_as_obstacle,
        start_override=start_override,
        record_steps=False,
        label_override=label_override,
    )
    t1 = time.perf_counter()
    elapsed_ms = max(0.01, round((t1 - t0) * 1000.0, 3))

    full = _execute_core_search(
        grid=grid,
        algorithm=algorithm,
        penalty_weight=penalty_weight,
        treat_unknown_as_obstacle=treat_unknown_as_obstacle,
        start_override=start_override,
        record_steps=True,
        label_override=label_override,
    )
    full["executionTimeMs"] = elapsed_ms
    return full
