"use client";

import { useEffect, useState } from "react";

export interface RankingHistoryPoint {
  at: string;
  rank: number | null;
  label: string;
}

interface RankingDetail {
  pageId: string;
  keyword: string;
  slug: string;
  summary: {
    rank: number | null;
    previousRank: number | null;
    change: number | null;
    checkedAt: string | null;
  } | null;
  history: RankingHistoryPoint[];
}

interface Props {
  pageId: string;
  keyword: string;
  onClose: () => void;
}

function formatRank(rank: number | null): string {
  if (rank === null) return "100위 밖";
  return `${rank}위`;
}

function RankingChart({ history }: { history: RankingHistoryPoint[] }) {
  const width = 520;
  const height = 220;
  const pad = { top: 20, right: 16, bottom: 36, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        아직 수집된 순위 데이터가 없습니다. 하루 2회 자동 확인됩니다.
      </p>
    );
  }

  const ranks = history.map((h) => h.rank ?? 101);
  const maxRank = Math.max(10, ...ranks.filter((r) => r <= 100), 100);

  const points = history.map((h, i) => {
    const x = pad.left + (history.length === 1 ? innerW / 2 : (i / (history.length - 1)) * innerW);
    const rankVal = h.rank ?? maxRank + 1;
    const y = pad.top + ((rankVal - 1) / maxRank) * innerH;
    return { x, y, ...h };
  });

  const linePairs: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev.rank !== null && curr.rank !== null) {
      linePairs.push({ x1: prev.x, y1: prev.y, x2: curr.x, y2: curr.y });
    }
  }

  const yTicks = [1, Math.ceil(maxRank / 2), maxRank];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-full" role="img" aria-label="순위 변동 그래프">
        {yTicks.map((tick) => {
          const y = pad.top + ((tick - 1) / maxRank) * innerH;
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="#eee"
                strokeDasharray="4 4"
              />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#999">
                {tick}위
              </text>
            </g>
          );
        })}

        {linePairs.map((seg, i) => (
          <line
            key={i}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill={p.rank === null ? "#ccc" : "#f97316"}
              stroke="#fff"
              strokeWidth="2"
            />
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#888"
            >
              {p.label.split(" ").pop()}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-xs text-gray-400 text-center mt-1">순위가 낮을수록(1위) 그래프 위쪽 · 100위 밖은 하단 표시</p>
    </div>
  );
}

export default function RankingHistoryModal({ pageId, keyword, onClose }: Props) {
  const [detail, setDetail] = useState<RankingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/seo-rankings/${encodeURIComponent(pageId)}`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const summary = detail?.summary;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-dark text-lg">네이버 웹문서 순위</h3>
            <p className="text-sm text-gray-500 mt-1">{keyword}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-dark text-xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">불러오는 중...</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl bg-orange/10 p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">현재 순위</p>
                <p className="font-bold text-orange text-lg">
                  {formatRank(summary?.rank ?? null)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">이전 순위</p>
                <p className="font-bold text-dark">
                  {summary?.previousRank != null ? formatRank(summary.previousRank) : "-"}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">변동</p>
                <p
                  className={`font-bold ${
                    summary?.change == null
                      ? "text-gray-400"
                      : summary.change > 0
                        ? "text-emerald-600"
                        : summary.change < 0
                          ? "text-red-500"
                          : "text-dark"
                  }`}
                >
                  {summary?.change == null
                    ? "-"
                    : summary.change > 0
                      ? `▲ ${summary.change}`
                      : summary.change < 0
                        ? `▼ ${Math.abs(summary.change)}`
                        : "—"}
                </p>
              </div>
            </div>

            <h4 className="text-sm font-semibold text-dark mb-2">최근 7일 순위 변동</h4>
            <RankingChart history={detail?.history ?? []} />

            {summary?.checkedAt && (
              <p className="text-xs text-gray-400 mt-4 text-center">
                마지막 확인: {new Date(summary.checkedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
