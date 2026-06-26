import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * AdminTable
 *
 * Unified data table with sticky header, compact rows, skeleton loading,
 * empty state, and pagination footer.
 *
 * @param {Array}   columns       – [{ key, label, align, render }]
 * @param {Array}   rows          – data rows
 * @param {string}  rowKey        – field to use as row key (default "id")
 * @param {boolean} loading       – show skeleton
 * @param {string}  emptyText     – message when rows.length === 0
 * @param {number}  total         – total records (for pagination)
 * @param {number}  offset        – current offset
 * @param {number}  limit         – page size
 * @param {function} onPageChange – called with new offset
 * @param {function} onRowClick   – row click handler
 * @param {string}  className
 * @param {string}  testId
 */
export function AdminTable({
  columns = [],
  rows = [],
  rowKey = "id",
  loading = false,
  emptyText = "No records found",
  total,
  offset = 0,
  limit = 50,
  onPageChange,
  onRowClick,
  className = "",
  testId,
}) {
  const showPager = total !== undefined && onPageChange;
  const from = total === 0 ? 0 : offset + 1;
  const to   = Math.min(offset + limit, total ?? rows.length);

  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      {/* Table */}
      <div
        className="rounded-md border border-white/10 overflow-hidden overflow-x-auto"
        data-testid={testId}
      >
        <table className="w-full">
          {/* Sticky header */}
          <thead className="bg-white/[0.05] text-[9px] tracking-[0.2em] uppercase text-white/45 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-1.5 font-normal whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.04]">
            {/* Loading skeleton */}
            {loading && rows.length === 0 &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-2 py-1.5">
                      <div
                        className="h-3 rounded bg-white/[0.06] animate-pulse"
                        style={{ width: `${60 + Math.random() * 30}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {/* Empty state */}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-4 text-center text-white/35 text-xs"
                >
                  {emptyText}
                </td>
              </tr>
            )}

            {/* Data rows */}
            {rows.map((row) => (
              <tr
                key={row[rowKey] ?? JSON.stringify(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`text-xs font-mono-data ${
                  onRowClick
                    ? "cursor-pointer hover:bg-white/[0.03] transition-colors"
                    : ""
                } ${loading ? "opacity-50" : ""}`}
                data-testid={`admin-row-${row[rowKey]}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-2 py-1 ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${col.className || ""}`}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {showPager && (
        <div className="flex items-center justify-between pt-2 text-[10px] text-white/35">
          <span>
            {total === 0 ? "0 records" : `${from}–${to} of ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={offset <= 0 || loading}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              className="p-1 rounded border border-white/10 disabled:opacity-25 hover:bg-white/[0.04] transition-colors"
            >
              <ChevronLeft size={12} />
            </button>
            <button
              type="button"
              disabled={offset + limit >= (total ?? 0) || loading}
              onClick={() => onPageChange(offset + limit)}
              className="p-1 rounded border border-white/10 disabled:opacity-25 hover:bg-white/[0.04] transition-colors"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
