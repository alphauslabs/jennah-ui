import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";

const statusMap: Record<string, { className: string; label: string }> = {
  Running: {
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    label: "Running",
  },
  Completed: {
    className:
      "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    label: "Completed",
  },
  Pending: {
    className: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    label: "Pending",
  },
  Scheduled: {
    className:
      "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    label: "Scheduled",
  },
  Failed: {
    className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    label: "Failed",
  },
  Cancelled: {
    className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    label: "Cancelled",
  },
};

interface ExecutionHistoryItem {
  id: string;
  status:
    | "Running"
    | "Completed"
    | "Pending"
    | "Scheduled"
    | "Failed"
    | "Cancelled";
  jobName: string;
  jobId: string;
  runId: string;
  user: string;
  duration: string;
}

interface ExecutionHistoryProps {
  history: ExecutionHistoryItem[];
}

type SortColumn = "status" | "jobName" | "user" | "duration" | null;
type SortDirection = "asc" | "desc";

export function ExecutionHistory({ history }: ExecutionHistoryProps) {
  const navigate = useNavigate();
  const [sortColumn, setSortColumn] = useState<SortColumn>("duration");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending for dates, ascending for text
      setSortColumn(column);
      setSortDirection(column === "duration" ? "desc" : "asc");
    }
  };

  const sortedHistory = useMemo(() => {
    if (!sortColumn) return history;

    const sorted = [...history].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortColumn) {
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "jobName":
          aVal = a.jobName;
          bVal = b.jobName;
          break;
        case "user":
          aVal = a.user;
          bVal = b.user;
          break;
        case "duration":
          // Parse relative time for sorting (latest first)
          const getTime = (str: string): number => {
            if (str === "just now") return 0;
            const match = str.match(/(\d+)([mhd])/);
            if (!match) return Infinity;
            const [, num, unit] = match;
            const n = parseInt(num);
            switch (unit) {
              case "m":
                return n * 60;
              case "h":
                return n * 3600;
              case "d":
                return n * 86400;
              default:
                return Infinity;
            }
          };
          aVal = getTime(a.duration);
          bVal = getTime(b.duration);
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDirection === "asc" ? comparison : -comparison;
      }
    });

    return sorted;
  }, [history, sortColumn, sortDirection]);

  const handleView = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const SortHeader = ({
    column,
    label,
  }: {
    column: SortColumn;
    label: string;
  }) => (
    <TableHead
      onClick={() => handleSort(column)}
      className="px-6 py-4 text-xs font-semibold text-gray-600 text-left cursor-pointer hover:text-black transition-colors"
    >
      <div className="flex items-center gap-2">
        {label}
        {sortColumn === column && (
          sortDirection === "asc" ? (
            <ArrowUp className="w-4 h-4" />
          ) : (
            <ArrowDown className="w-4 h-4" />
          )
        )}
      </div>
    </TableHead>
  );

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-semibold text-black mb-8 leading-tight">
        Execution History
      </h1>
      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 bg-white hover:bg-white">
              <SortHeader column="status" label="Status" />
              <SortHeader column="jobName" label="Job Name" />
              <TableHead className="px-6 py-4 text-xs font-semibold text-gray-600 text-left">
                Run ID
              </TableHead>
              <SortHeader column="user" label="User" />
              <SortHeader column="duration" label="Last Run" />
              <TableHead className="px-6 py-4 text-xs font-semibold text-gray-600 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedHistory.map((execution) => (
              <TableRow
                key={execution.id}
                className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors"
              >
                <TableCell className="px-6 py-4 text-sm">
                  <Badge className={statusMap[execution.status]?.className}>
                    {statusMap[execution.status]?.label || execution.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-6 py-4 text-sm font-medium text-black">
                  {execution.jobName}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-gray-600">
                  {execution.runId}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-gray-600">
                  {execution.user}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-gray-600">
                  {execution.duration}
                </TableCell>
                <TableCell className="px-6 py-4 text-sm text-right">
                  <button
                    onClick={() =>
                      execution.status === "Completed" &&
                      handleView(execution.jobId)
                    }
                    disabled={execution.status !== "Completed"}
                    className={`font-medium text-xs transition-colors ${
                      execution.status === "Completed"
                        ? "text-gray-600 hover:text-black cursor-pointer"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {execution.status === "Running"
                      ? "Stop"
                      : execution.status === "Completed"
                        ? "View"
                        : "Retry"}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
