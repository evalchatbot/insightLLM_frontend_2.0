"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

type Row = { subject: string; label?: string; count: number };

export default function EvalStatsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/eval-stats", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRows(Array.isArray(data.subjects) ? data.subjects : []);
        setTotal(data.total || 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh shortly after an evaluation is submitted, plus a slow fallback poll.
    const onRecorded = () => setTimeout(load, 1200);
    window.addEventListener("evalStatRecorded", onRecorded);
    const iv = setInterval(load, 20000);
    return () => {
      window.removeEventListener("evalStatRecorded", onRecorded);
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-800 dark:text-zinc-100">
          <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" /> Evaluation Stats
        </h3>
        <button
          onClick={load}
          className="p-2 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          title="Refresh"
          aria-label="Refresh stats"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-4">
        <div className="text-4xl font-black text-red-700 dark:text-red-400 leading-none">{total}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Total evaluations</div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No evaluations recorded yet.</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li
              key={r.subject}
              className="flex items-center justify-between text-sm border-b border-zinc-100 dark:border-zinc-800 py-2 last:border-0"
            >
              <span className="text-zinc-700 dark:text-zinc-300 truncate pr-3">{r.label || r.subject}</span>
              <span className="font-bold text-zinc-900 dark:text-white tabular-nums">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
