import React, { useState } from 'react';
import { SearchResult } from '../types/field';
import { downloadTextFile, generateCsvResults } from '../data/pythonExport';
import { BarChart3, Check, Copy, Download, Play } from 'lucide-react';

interface BenchmarkViewProps {
  results: SearchResult[];
  presetName: string;
  penaltyWeight: number;
  sensorRadius: number;
  onRunBenchmark: () => void;
}

export const BenchmarkView: React.FC<BenchmarkViewProps> = ({
  results,
  presetName,
  penaltyWeight,
  sensorRadius,
  onRunBenchmark,
}) => {
  const [copiedMd, setCopiedMd] = useState(false);

  const maxExpanded = Math.max(1, ...results.map((r) => r.expandedNodes));
  const maxCost = Math.max(1, ...results.map((r) => r.totalCost));

  const copyMarkdownTable = () => {
    const header =
      '| Algorithm | Path Length | Total Cost | Near-Crop Steps | Expanded Nodes | Time (ms) | Reached | Replans |\n| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |';
    const rows = results
      .map(
        (r) =>
          `| ${r.label} | ${r.pathLength} | ${r.totalCost} | ${r.riskSteps} | ${r.expandedNodes} | ${r.executionTimeMs.toFixed(
            3
          )} | ${r.reached ? 'Yes' : 'No'} | ${r.replanCount !== undefined ? r.replanCount : '-'} |`
      )
      .join('\n');
    navigator.clipboard?.writeText(`${header}\n${rows}`);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 1800);
  };

  const astarStd = results.find((r) => r.algorithm === 'ASTAR');
  const astarSafe = results.find((r) => r.algorithm === 'ASTAR_SAFE');
  const bfsRes = results.find((r) => r.algorithm === 'BFS');
  const gbfsRes = results.find((r) => r.algorithm === 'GBFS');
  const replanRes = results.find((r) => r.algorithm === 'ASTAR_REPLAN');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-emerald-50">
            06. Performance Evaluation & Algorithm Comparison
          </h2>
          <p className="mt-1 text-sm text-emerald-200/80">
            Field: <span className="text-emerald-100 font-medium">{presetName}</span> · Crop-Safe Penalty:{' '}
            <span className="font-mono text-amber-300 tabular-nums">+{penaltyWeight}</span> · Sensor Radius:{' '}
            <span className="font-mono text-amber-300 tabular-nums">{sensorRadius} cells</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRunBenchmark}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-400 text-[#0d1511] rounded-lg hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            Re-Run All Trials
          </button>
          <button
            type="button"
            onClick={() => downloadTextFile('benchmark_results.csv', generateCsvResults(results), 'text/csv;charset=utf-8')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#17261e] text-emerald-100 border border-emerald-800 rounded-lg hover:bg-[#1e3127] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={copyMarkdownTable}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#17261e] text-emerald-100 border border-emerald-800 rounded-lg hover:bg-[#1e3127] transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedMd ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copiedMd ? 'Copied Markdown' : 'Copy Markdown'}
          </button>
        </div>
      </div>

      {/* Main Comparison Table */}
      <div className="bg-[#131e18] border border-emerald-900/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-emerald-900/70 bg-[#0e1713] text-xs font-medium text-emerald-300">
                <th className="py-3.5 px-4">Algorithm</th>
                <th className="py-3.5 px-4 text-right">Path Length</th>
                <th className="py-3.5 px-4 text-right">Total Cost</th>
                <th className="py-3.5 px-4 text-right">Near-Crop Steps</th>
                <th className="py-3.5 px-4 text-right">Expanded Nodes</th>
                <th className="py-3.5 px-4 text-right">Time (ms)</th>
                <th className="py-3.5 px-4 text-center">Destination Reached</th>
                <th className="py-3.5 px-4 text-right">Replans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/40 text-sm">
              {results.map((r) => (
                <tr key={r.algorithm} className="hover:bg-[#18261f]/70 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-emerald-50 whitespace-nowrap">
                    {r.label}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-100">
                    {r.reached ? `${r.pathLength} steps` : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-300 font-semibold">
                    {r.reached ? r.totalCost : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    <span className={r.riskSteps > 0 ? 'text-rose-300' : 'text-emerald-400'}>
                      {r.reached ? r.riskSteps : '-'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-cyan-300">
                    {r.expandedNodes}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-200/85">
                    {r.executionTimeMs.toFixed(3)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-xs font-medium ${
                        r.reached ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {r.reached ? 'Yes · Goal Reached' : 'No · Blocked'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-amber-200">
                    {r.replanCount !== undefined ? r.replanCount : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Trade-off Bars & Analytical Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h3 className="font-display text-lg font-semibold text-emerald-50">
              Expanded Nodes vs. Total Path Cost
            </h3>
          </div>
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.algorithm} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-100 font-medium">{r.label}</span>
                  <span className="font-mono tabular-nums text-emerald-300">
                    {r.expandedNodes} nodes · cost {r.totalCost}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-2 bg-[#0b120f] rounded overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${Math.round((r.expandedNodes / maxExpanded) * 100)}%` }}
                    />
                  </div>
                  <div className="h-2 bg-[#0b120f] rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${Math.round((r.totalCost / maxCost) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-5 pt-2 text-xs text-emerald-300/80 border-t border-emerald-900/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-xs" />
              Expanded Nodes (Search Effort)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs" />
              Total Path Cost (Crop-Safe Objective)
            </span>
          </div>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-2xl space-y-3">
          <h3 className="font-display text-lg font-semibold text-emerald-50">
            Automated Empirical Observations
          </h3>
          <ul className="space-y-2.5 text-sm text-emerald-200/85 leading-relaxed">
            <li>
              <span className="font-semibold text-emerald-100">Uninformed vs. Informed:</span>{' '}
              {bfsRes && gbfsRes
                ? `BFS expanded ${bfsRes.expandedNodes} nodes to guarantee shortest hop length (${bfsRes.pathLength} steps), whereas Greedy Best-First expanded ${gbfsRes.expandedNodes} nodes using Manhattan distance.`
                : 'BFS guarantees shortest hop count while Greedy Best-First reduces expansions via Manhattan distance.'}
            </li>
            <li>
              <span className="font-semibold text-emerald-100">Crop-Safe Penalty Impact (Task 4):</span>{' '}
              {astarStd && astarSafe
                ? `Standard A* yielded ${astarStd.riskSteps} near-crop risk step(s) (cost ${astarStd.totalCost}). Enabling Crop-Safe penalty (+${penaltyWeight}) shifted A* to ${astarSafe.riskSteps} risk step(s) with total cost ${astarSafe.totalCost}.`
                : 'Crop-Safe A* penalizes cells bordering protected seedling beds.'}
            </li>
            <li>
              <span className="font-semibold text-emerald-100">Online Unknown Obstacle Handling (Task 5):</span>{' '}
              {replanRes
                ? `Online A* Replanning navigated the unknown field in ${replanRes.pathLength} actual steps, performing ${replanRes.replanCount ?? 0} dynamic replanning operation(s) across ${replanRes.expandedNodes} cumulative expanded nodes.`
                : 'Online A* updates its internal map whenever unknown obstacles enter sensor range.'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
