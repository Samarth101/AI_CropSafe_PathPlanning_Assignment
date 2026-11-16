import React, { useEffect, useState } from 'react';
import { SearchResult, TeamMember } from '../types/field';
import {
  downloadTextFile,
  generateReadmeMarkdown,
} from '../data/pythonExport';
import { BookOpen, Check, Copy, Download, FileCode2, FileText, Users } from 'lucide-react';

interface SubmissionViewProps {
  members: TeamMember[];
  onUpdateMember: (id: number, field: 'name' | 'rollNumber', value: string) => void;
  results: SearchResult[];
  presetName: string;
  penaltyWeight: number;
}

export const SubmissionView: React.FC<SubmissionViewProps> = ({
  members,
  onUpdateMember,
  results,
  presetName,
  penaltyWeight,
}) => {
  const [pythonSource, setPythonSource] = useState<string>('');
  const [loadingSource, setLoadingSource] = useState<boolean>(true);
  const [copiedPy, setCopiedPy] = useState(false);

  const readmeText = generateReadmeMarkdown(members, results, presetName, penaltyWeight);

  useEffect(() => {
    let active = true;
    fetch('/python/cropsafe_planner.py')
      .then((res) => (res.ok ? res.text() : ''))
      .then((text) => {
        if (active) {
          setPythonSource(text);
          setLoadingSource(false);
        }
      })
      .catch(() => {
        if (active) setLoadingSource(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const copyPython = () => {
    if (!pythonSource) return;
    navigator.clipboard?.writeText(pythonSource);
    setCopiedPy(true);
    setTimeout(() => setCopiedPy(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-emerald-50">
            3-Member Team Division & Standalone Python / Notebook Kit
          </h2>
          <p className="mt-1 text-sm text-emerald-200/80 max-w-3xl">
            Standalone <span className="font-mono text-emerald-100">.py</span> and explanatory <span className="font-mono text-emerald-100">.ipynb</span> files stored cleanly on disk, paired with your 3-student division and auto-generated <span className="font-mono text-emerald-100">README.md</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/python/cropsafe_planner.py"
            download="cropsafe_planner.py"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-amber-400 text-[#0d1511] rounded-lg hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            cropsafe_planner.py
          </a>
          <a
            href="/python/cropsafe_planner.ipynb"
            download="cropsafe_planner.ipynb"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 text-[#0b120e] rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" />
            cropsafe_planner.ipynb
          </a>
          <a
            href="/python/requirements.txt"
            download="requirements.txt"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#17261e] text-emerald-100 border border-emerald-800 rounded-lg hover:bg-[#1e3127] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            requirements.txt
          </a>
          <button
            type="button"
            onClick={() => downloadTextFile('README.md', readmeText)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#17261e] text-emerald-100 border border-emerald-800 rounded-lg hover:bg-[#1e3127] transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            Download README.md
          </button>
        </div>
      </div>

      {/* Standalone Files Inventory + Submission Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-2xl space-y-3">
          <h3 className="font-display text-lg font-semibold text-emerald-50">
            Standalone Python & Notebook Deliverables
          </h3>
          <ul className="space-y-2 text-sm text-emerald-200/85 leading-relaxed">
            <li>
              <span className="font-mono text-amber-300">cropsafe_planner.py</span> — Clean, modular Python 3 script implementing Tasks 1–6 using NumPy &amp; Matplotlib, saving <span className="font-mono text-emerald-100">field_comparison.png</span> and <span className="font-mono text-emerald-100">replanning_trace.png</span>.
            </li>
            <li>
              <span className="font-mono text-emerald-300">cropsafe_planner.ipynb</span> — Standalone 14-cell Jupyter Notebook pairing LaTeX math formulation, algorithm explanations, step-by-step runnable Python cells, and inline plots for viva &amp; GitHub review.
            </li>
            <li>
              <span className="font-mono text-emerald-100">requirements.txt</span> — Pinned <span className="font-mono">numpy</span> and <span className="font-mono">matplotlib</span> dependencies.
            </li>
          </ul>
        </div>

        <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-2xl space-y-3">
          <h3 className="font-display text-lg font-semibold text-emerald-50">
            GitHub &amp; Email Submission Checklist
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-emerald-200/85">
            <div className="p-3 bg-[#0e1713] border border-emerald-900/50 rounded-lg">
              <div className="text-xs text-emerald-400">Suggested Repo Name</div>
              <div className="font-mono text-xs text-emerald-50 mt-0.5 break-all">
                AI_CropSafe_PathPlanning_GroupXX
              </div>
            </div>
            <div className="p-3 bg-[#0e1713] border border-emerald-900/50 rounded-lg">
              <div className="text-xs text-emerald-400">Instructor Email</div>
              <div className="font-mono text-xs text-emerald-50 mt-0.5">
                jchakole@iiitn.ac.in
              </div>
            </div>
            <div className="p-3 bg-[#0e1713] border border-emerald-900/50 rounded-lg">
              <div className="text-xs text-emerald-400">Email Subject</div>
              <div className="text-xs text-emerald-50 mt-0.5">
                AI Group Coding Assignment Submission – Group XX
              </div>
            </div>
            <div className="p-3 bg-[#0e1713] border border-emerald-900/50 rounded-lg">
              <div className="text-xs text-emerald-400">Deadline</div>
              <div className="font-mono text-xs text-amber-300 mt-0.5">
                16 November 2026
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Member Division of Work */}
      <div className="p-5 bg-[#131e18] border border-emerald-900/60 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h3 className="font-display text-lg font-semibold text-emerald-50">
            3-Student Work Split (Enter Your Names &amp; Roll Numbers for README.md)
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div
              key={m.id}
              className="p-4 bg-[#0e1713] border border-emerald-900/60 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-amber-300 text-sm">
                  Member {m.id}
                </span>
                <span className="text-xs text-emerald-400 font-mono">{m.tasksCovered}</span>
              </div>
              <div className="text-sm font-semibold text-emerald-50">{m.roleTitle}</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={m.name}
                  placeholder={`Student ${m.id} Full Name`}
                  onChange={(e) => onUpdateMember(m.id, 'name', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-[#14201a] border border-emerald-800/70 rounded-lg text-emerald-100 placeholder:text-emerald-600 focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={m.rollNumber}
                  placeholder="Roll Number (e.g. BT24CSE001)"
                  onChange={(e) => onUpdateMember(m.id, 'rollNumber', e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-mono bg-[#14201a] border border-emerald-800/70 rounded-lg text-emerald-100 placeholder:text-emerald-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview fetched from standalone /python/cropsafe_planner.py */}
      <div className="bg-[#131e18] border border-emerald-900/60 rounded-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0e1713] border-b border-emerald-900/60">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-100">
            <FileCode2 className="w-4 h-4 text-amber-400" />
            <span className="font-mono">public/python/cropsafe_planner.py</span>
            <span aria-hidden="true" className="text-emerald-700">·</span>
            <span className="text-xs text-emerald-400">Loaded from standalone file</span>
          </div>
          <button
            type="button"
            disabled={!pythonSource}
            onClick={copyPython}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#18261f] text-emerald-100 border border-emerald-800 rounded-md hover:bg-[#21332a] cursor-pointer disabled:opacity-50"
          >
            {copiedPy ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPy ? 'Copied Code' : 'Copy Python Code'}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-emerald-100/90 overflow-x-auto max-h-[420px] leading-relaxed">
          <code>
            {loadingSource
              ? 'Loading standalone cropsafe_planner.py...'
              : pythonSource || 'Download cropsafe_planner.py using the button above.'}
          </code>
        </pre>
      </div>
    </div>
  );
};
