import { SearchResult } from '../types/field';

export function generateCsvResults(results: SearchResult[]): string {
  const header =
    'Algorithm,Path Length,Total Cost,Near-Crop Steps,Expanded Nodes,Execution Time (ms),Reached,Replans';
  const rows = results.map((r) =>
    [
      `"${r.label}"`,
      r.pathLength,
      r.totalCost,
      r.riskSteps,
      r.expandedNodes,
      r.executionTimeMs.toFixed(3),
      r.reached ? 'Yes' : 'No',
      r.replanCount !== undefined ? r.replanCount : '-',
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8'
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
