"""
api_bridge.py
-------------
Shared evaluation entrypoint used by the FastAPI backend (api/index.py),
the local dev server fallback, and CLI calls.
"""

import json
import sys
from typing import Any, Dict

from .online_replan import run_online_replanning
from .search_algorithms import run_search


def evaluate_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    grid = payload["grid"]
    selected_algo = payload.get("selectedAlgo", "ASTAR_SAFE")
    penalty_weight = int(payload.get("penaltyWeight", 5))
    sensor_radius = int(payload.get("sensorRadius", 2))

    effective_penalty = penalty_weight if selected_algo == "ASTAR_SAFE" else 0
    search_result = run_search(
        grid=grid,
        algorithm=selected_algo,
        penalty_weight=effective_penalty,
        treat_unknown_as_obstacle=False,
    )

    compare_standard = run_search(
        grid=grid,
        algorithm="ASTAR",
        penalty_weight=0,
        treat_unknown_as_obstacle=False,
        label_override="A* Search (Standard)",
    )

    compare_safe = run_search(
        grid=grid,
        algorithm="ASTAR_SAFE",
        penalty_weight=penalty_weight,
        treat_unknown_as_obstacle=False,
        label_override="A* Search (Crop-Safe)",
    )

    online_run = run_online_replanning(
        true_grid=grid,
        penalty_weight=penalty_weight,
        sensor_radius=sensor_radius,
    )

    bfs_res = run_search(grid, "BFS", penalty_weight=penalty_weight)
    dfs_res = run_search(grid, "DFS", penalty_weight=penalty_weight)
    gbfs_res = run_search(grid, "GBFS", penalty_weight=penalty_weight)

    def slim(res: Dict[str, Any]) -> Dict[str, Any]:
        return {k: v for k, v in res.items() if k not in ("steps", "costsByKey")}

    benchmark_results = [
        slim(bfs_res),
        slim(dfs_res),
        slim(gbfs_res),
        slim(compare_standard),
        slim(compare_safe),
        slim(online_run["summary"]),
    ]

    return {
        "searchResult": search_result,
        "compareStandardResult": slim(compare_standard),
        "compareSafeResult": slim(compare_safe),
        "onlineRun": online_run,
        "benchmarkResults": benchmark_results,
    }


def main() -> None:
    raw = sys.stdin.read()
    payload = json.loads(raw)
    output = evaluate_payload(payload)
    sys.stdout.write(json.dumps(output))


if __name__ == "__main__":
    main()
