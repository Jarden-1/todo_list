// Toolbar for the completed view: search input, date-filter chips, custom
// date-range picker, and the summary / bulk-action row.
import { Calendar, CheckCircle2, CheckSquare, Search, Trash2, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import { DATE_FILTER_CHIPS, type DateFilter } from "./utils";

interface CompletedToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
  hasFilterOrSearch: boolean;
  multiSelect: boolean;
  onToggleMultiSelect: () => void;
  onExitMultiSelect: () => void;
  onClearAll: () => void;
}

export function CompletedToolbar({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onClearFilters,
  totalCount,
  filteredCount,
  hasFilterOrSearch,
  multiSelect,
  onToggleMultiSelect,
  onExitMultiSelect,
  onClearAll,
}: CompletedToolbarProps) {
  return (
    <>
      {/* Search + date filter */}
      <div className="space-y-3 px-3 py-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索已完成的待办（标题 + 正文）…"
            className="w-full pl-9 pr-9 py-2 text-sm bg-background/70 rounded-lg border border-border/40 focus:border-primary/45 focus:outline-none placeholder:text-muted-foreground/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
              aria-label="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {DATE_FILTER_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => onDateFilterChange(chip.value)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
                dateFilter === chip.value
                  ? "bg-primary/15 text-primary"
                  : "bg-background/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onDateFilterChange("custom")}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
              dateFilter === "custom"
                ? "bg-primary/15 text-primary"
                : "bg-background/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Calendar className="w-3 h-3" /> 自定义
          </button>
        </div>

        {dateFilter === "custom" && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="field-input flex-1 min-w-0 text-xs"
              aria-label="开始日期"
            />
            <span className="text-xs text-muted-foreground">至</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="field-input flex-1 min-w-0 text-xs"
              aria-label="结束日期"
            />
            {(customStart || customEnd) && (
              <button
                type="button"
                onClick={() => {
                  onCustomStartChange("");
                  onCustomEndChange("");
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                清除
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary + bulk actions */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
        <span className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          共完成 {totalCount} 项任务
          {hasFilterOrSearch && (
            <span className="text-muted-foreground/70">· 匹配 {filteredCount} 项</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {multiSelect ? (
            <button
              type="button"
              onClick={onExitMultiSelect}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" /> 退出多选
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleMultiSelect}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
            >
              <CheckSquare className="h-3.5 w-3.5" /> 多选删除
            </button>
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-red-500/90 hover:bg-red-500/10 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> 清空全部
          </button>
        </div>
      </div>

      {/* No-match state */}
      {filteredCount === 0 && hasFilterOrSearch && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">无匹配的已完成待办</p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            清除筛选条件
          </button>
        </div>
      )}
    </>
  );
}
