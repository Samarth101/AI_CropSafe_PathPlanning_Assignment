"""
online_replan.py
----------------
Task 5: Simulates the robot starting with no knowledge of hidden obstacles,
scanning within a Manhattan sensor radius as it moves, updating its internal
map upon discovery, and invoking A* to calculate a fresh detour whenever its
planned route becomes blocked.
"""

import time
from typing import Any, Dict, List, Set

from .field_rules import (
    CoordTuple,
    Grid,
    compute_path_stats,
    coord_dict,
    coord_key,
    find_special_positions,
)
from .search_algorithms import _execute_core_search


def _get_sensor_coords(rows: int, cols: int, center: CoordTuple, radius: int) -> List[CoordTuple]:
    coords: List[CoordTuple] = []
    for r in range(max(0, center[0] - radius), min(rows, center[0] + radius + 1)):
        for c in range(max(0, center[1] - radius), min(cols, center[1] + radius + 1)):
            if abs(r - center[0]) + abs(c - center[1]) <= radius:
                coords.append((r, c))
    return coords


def run_online_replanning(
    true_grid: Grid,
    penalty_weight: int = 5,
    sensor_radius: int = 2,
) -> Dict[str, Any]:
    t0 = time.perf_counter()
    rows = len(true_grid)
    cols = len(true_grid[0]) if rows > 0 else 0
    start, goal = find_special_positions(true_grid)

    # Known map initially hides UNKNOWN_OBSTACLE as SAFE
    known_grid: Grid = [
        ["SAFE" if cell == "UNKNOWN_OBSTACLE" else cell for cell in row]
        for row in true_grid
    ]

    total_expanded_nodes = 0
    replan_count = 0
    discovered_set: Set[str] = set()
    events: List[Dict[str, Any]] = []
    frames: List[Dict[str, Any]] = []

    initial_search = _execute_core_search(
        known_grid,
        "ASTAR_SAFE",
        penalty_weight=penalty_weight,
        treat_unknown_as_obstacle=True,
        start_override=start,
        record_steps=False,
    )
    total_expanded_nodes += initial_search["expandedNodes"]

    initial_path: List[CoordTuple] = [
        (p["r"], p["c"]) for p in initial_search["path"]
    ]
    current_route: List[CoordTuple] = list(initial_path)
    robot_pos: CoordTuple = start
    traveled_path: List[CoordTuple] = [start]

    def scan_and_update(pos: CoordTuple) -> List[CoordTuple]:
        sensor_cells = _get_sensor_coords(rows, cols, pos, sensor_radius)
        newly_found: List[CoordTuple] = []
        for sr, sc in sensor_cells:
            if true_grid[sr][sc] == "UNKNOWN_OBSTACLE":
                k = coord_key(sr, sc)
                if k not in discovered_set:
                    discovered_set.add(k)
                    known_grid[sr][sc] = "OBSTACLE"
                    newly_found.append((sr, sc))
        return newly_found

    initial_sensor = [
        coord_key(sr, sc) for sr, sc in _get_sensor_coords(rows, cols, robot_pos, sensor_radius)
    ]
    frames.append({
        "robotPos": coord_dict(robot_pos[0], robot_pos[1]),
        "traveledPath": [coord_dict(r, c) for r, c in traveled_path],
        "activeRoute": [coord_dict(r, c) for r, c in current_route],
        "previousRoute": [coord_dict(r, c) for r, c in current_route],
        "discoveredKeys": sorted(discovered_set),
        "sensorKeys": initial_sensor,
        "status": "PLANNING" if current_route else "NO_PATH",
        "eventMessage": (
            f"Robot planned its starting path ({len(current_route) - 1} steps). Hidden obstacles are not visible yet."
            if current_route
            else "No safe starting path exists from Start to Goal."
        ),
        "replanCount": 0,
    })

    if not current_route:
        t1 = time.perf_counter()
        return {
            "frames": frames,
            "events": events,
            "initialPath": [],
            "summary": {
                "algorithm": "ASTAR_REPLAN",
                "label": "Online A* Replanning",
                "path": [],
                "expandedNodes": total_expanded_nodes,
                "pathLength": 0,
                "totalCost": 0,
                "riskSteps": 0,
                "executionTimeMs": max(0.01, round((t1 - t0) * 1000.0, 3)),
                "reached": False,
                "steps": [],
                "costsByKey": {},
                "replanCount": 0,
            },
        }

    safety_loop_guard = 0
    max_steps = rows * cols * 4

    while robot_pos != goal and safety_loop_guard < max_steps:
        safety_loop_guard += 1
        newly_found = scan_and_update(robot_pos)
        sensor_keys = [
            coord_key(sr, sc) for sr, sc in _get_sensor_coords(rows, cols, robot_pos, sensor_radius)
        ]

        remaining_idx = current_route.index(robot_pos) if robot_pos in current_route else 0
        remaining_slice = current_route[remaining_idx:]
        is_route_blocked = any(known_grid[r][c] == "OBSTACLE" for r, c in remaining_slice)

        if newly_found and is_route_blocked:
            replan_count += 1
            previous_route = list(remaining_slice)
            replan_search = _execute_core_search(
                known_grid,
                "ASTAR_SAFE",
                penalty_weight=penalty_weight,
                treat_unknown_as_obstacle=True,
                start_override=robot_pos,
                record_steps=False,
            )
            total_expanded_nodes += replan_search["expandedNodes"]
            detected_text = ", ".join(f"({r}, {c})" for r, c in newly_found)

            if not replan_search["reached"] or not replan_search["path"]:
                msg = f"Found hidden obstacle at {detected_text}. Replan #{replan_count} found no open detour."
                events.append({
                    "frameIndex": len(frames),
                    "robotPos": coord_dict(robot_pos[0], robot_pos[1]),
                    "detectedObstacles": [coord_dict(r, c) for r, c in newly_found],
                    "replanNumber": replan_count,
                    "message": msg,
                })
                frames.append({
                    "robotPos": coord_dict(robot_pos[0], robot_pos[1]),
                    "traveledPath": [coord_dict(r, c) for r, c in traveled_path],
                    "activeRoute": [],
                    "previousRoute": [coord_dict(r, c) for r, c in previous_route],
                    "discoveredKeys": sorted(discovered_set),
                    "sensorKeys": sensor_keys,
                    "status": "NO_PATH",
                    "eventMessage": msg,
                    "replanCount": replan_count,
                })
                break

            current_route = [(p["r"], p["c"]) for p in replan_search["path"]]
            msg = f"Spotted hidden obstacle at {detected_text}! Updated map and calculated Detour #{replan_count} ({len(current_route) - 1} steps left)."
            events.append({
                "frameIndex": len(frames),
                "robotPos": coord_dict(robot_pos[0], robot_pos[1]),
                "detectedObstacles": [coord_dict(r, c) for r, c in newly_found],
                "replanNumber": replan_count,
                "message": msg,
            })
            frames.append({
                "robotPos": coord_dict(robot_pos[0], robot_pos[1]),
                "traveledPath": [coord_dict(r, c) for r, c in traveled_path],
                "activeRoute": [coord_dict(r, c) for r, c in current_route],
                "previousRoute": [coord_dict(r, c) for r, c in previous_route],
                "discoveredKeys": sorted(discovered_set),
                "sensorKeys": sensor_keys,
                "status": "DETECTED_REPLAN",
                "eventMessage": msg,
                "replanCount": replan_count,
            })
        elif newly_found:
            detected_text = ", ".join(f"({r}, {c})" for r, c in newly_found)
            frames.append({
                "robotPos": coord_dict(robot_pos[0], robot_pos[1]),
                "traveledPath": [coord_dict(r, c) for r, c in traveled_path],
                "activeRoute": [coord_dict(r, c) for r, c in remaining_slice],
                "previousRoute": [coord_dict(r, c) for r, c in remaining_slice],
                "discoveredKeys": sorted(discovered_set),
                "sensorKeys": sensor_keys,
                "status": "MOVING",
                "eventMessage": f"Spotted obstacle at {detected_text} off to the side. Current path is still clear.",
                "replanCount": replan_count,
            })

        idx_now = current_route.index(robot_pos) if robot_pos in current_route else -1
        next_step = current_route[idx_now + 1] if 0 <= idx_now + 1 < len(current_route) else None
        if next_step is None:
            break

        robot_pos = next_step
        traveled_path.append(robot_pos)

        is_goal = robot_pos == goal
        post_sensor_keys = [
            coord_key(sr, sc) for sr, sc in _get_sensor_coords(rows, cols, robot_pos, sensor_radius)
        ]
        next_idx = current_route.index(robot_pos) if robot_pos in current_route else -1

        frames.append({
            "robotPos": coord_dict(robot_pos[0], robot_pos[1]),
            "traveledPath": [coord_dict(r, c) for r, c in traveled_path],
            "activeRoute": [coord_dict(r, c) for r, c in (current_route[next_idx:] if next_idx >= 0 else [])],
            "previousRoute": [],
            "discoveredKeys": sorted(discovered_set),
            "sensorKeys": post_sensor_keys,
            "status": "GOAL_REACHED" if is_goal else "MOVING",
            "eventMessage": (
                f"Arrived safely at goal ({goal[0]}, {goal[1]}) in {len(traveled_path) - 1} steps after {replan_count} detour(s)."
                if is_goal
                else f"Robot drove to ({robot_pos[0]}, {robot_pos[1]}) and scanned {sensor_radius} tiles ahead."
            ),
            "replanCount": replan_count,
        })

    t1 = time.perf_counter()
    reached = robot_pos == goal
    final_path = traveled_path if reached else []
    stats = compute_path_stats(true_grid, final_path, penalty_weight)

    return {
        "frames": frames,
        "events": events,
        "initialPath": [coord_dict(r, c) for r, c in initial_path],
        "summary": {
            "algorithm": "ASTAR_REPLAN",
            "label": "Online A* Replanning",
            "path": [coord_dict(r, c) for r, c in final_path],
            "expandedNodes": total_expanded_nodes,
            "pathLength": stats["pathLength"],
            "totalCost": stats["totalCost"],
            "riskSteps": stats["riskSteps"],
            "executionTimeMs": max(0.01, round((t1 - t0) * 1000.0, 3)),
            "reached": reached,
            "steps": [],
            "costsByKey": {},
            "replanCount": replan_count,
        },
    }
