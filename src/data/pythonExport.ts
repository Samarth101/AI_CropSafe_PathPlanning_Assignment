import { SearchResult, TeamMember } from '../types/field';

export function generateReadmeMarkdown(
  members: TeamMember[],
  results: SearchResult[],
  presetName: string,
  penaltyWeight: number
): string {
  const tableRows = results
    .map(
      (r) =>
        `| ${r.label} | ${r.pathLength} | ${r.totalCost} | ${r.riskSteps} | ${r.expandedNodes} | ${r.executionTimeMs.toFixed(3)} | ${r.reached ? 'Yes' : 'No'} | ${r.replanCount !== undefined ? r.replanCount : '-'} |`
    )
    .join('\n');

  const memberLines = members
    .map(
      (m) =>
        `| ${m.id} | ${m.name || `Member ${m.id}`} | ${m.rollNumber || 'TBD'} | ${m.roleTitle} | ${m.tasksCovered} |`
    )
    .join('\n');

  return `# AI-Based Crop-Safe Path Planning for an Autonomous Potato-Field Robot

Course: Artificial Intelligence — Group Coding Assignment  
Deadline: 16 November 2026  
Team Size: 3 Students (Adapted Division of Work)

## 1. Project Overview
This project models an autonomous agricultural monitoring rover navigating a 2D potato field grid. The agent must reach a monitoring station from a start depot while avoiding static obstacles, potato crop rows, and protected seedling beds, applying proximity penalties for crop-safe routing and dynamically replanning via A* when unknown obstacles enter sensor range.

## 2. Repository Files
- \`cropsafe_planner.py\` — Standalone Python script implementing Tasks 1–6 (NumPy + Matplotlib)
- \`cropsafe_planner.ipynb\` — Standalone explanatory Jupyter Notebook with Markdown theory, equations, and plots
- \`requirements.txt\` — Python dependencies (\`numpy\`, \`matplotlib\`)

## 3. Group Members & Contribution (3-Member Split)
| Member | Name | Roll Number | Primary Responsibility | Assignment Tasks |
| :--- | :--- | :--- | :--- | :--- |
${memberLines}

## 4. Problem Formulation (Task 2)
- **Initial State**: $s_0 = (r_{\\text{start}}, c_{\\text{start}})$
- **Actions**: 4-directional cardinal movement $\\{\\text{Up}, \\text{Right}, \\text{Down}, \\text{Left}\\}$
- **Transition Model**: Deterministic grid step $s' = (r + \\Delta r, c + \\Delta c)$ if within bounds and passable
- **Goal Test**: $s == s_{\\text{goal}}$
- **Path-Cost Function**: $c(s, a, s') = 1 + \\text{penalty}(s')$, where $\\text{penalty}(s') = ${penaltyWeight}$ if $s'$ is orthogonally adjacent to a Protected Crop cell, else $0$.
- **Heuristic**: Manhattan Distance $h(n) = |r_n - r_{\\text{goal}}| + |c_n - c_{\\text{goal}}|$ (admissible & consistent on 4-connected grids with step cost $\\ge 1$).

## 5. Performance Comparison Table (${presetName})
| Algorithm | Path Length | Total Cost | Near-Crop Steps | Expanded Nodes | Execution Time (ms) | Reached | Replans |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
${tableRows}

## 6. Running the Standalone Python Files
\`\`\`bash
pip install -r requirements.txt
python cropsafe_planner.py
\`\`\`
Or open \`cropsafe_planner.ipynb\` in Jupyter Notebook / Google Colab for the step-by-step explained walkthrough.
`;
}

export function generateCsvResults(results: SearchResult[]): string {
  const header = 'Algorithm,Path Length,Total Cost,Near-Crop Steps,Expanded Nodes,Execution Time (ms),Reached,Replans';
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

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
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
