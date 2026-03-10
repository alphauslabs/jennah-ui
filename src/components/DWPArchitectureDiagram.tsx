/**
 * DWPArchitectureDiagram — visual representation of the distributed workload
 * processing architecture. Shows how input data is split across instances
 * and written to separate output files.
 */

interface DWPArchitectureDiagramProps {
  taskCount: number;
  inputPath: string;
  outputPath: string;
  inputDataSize: number;
  distributionMode: string;
}

export function DWPArchitectureDiagram({
  taskCount,
  inputPath,
  outputPath,
  inputDataSize,
  distributionMode,
}: DWPArchitectureDiagramProps) {
  const instances = Array.from({ length: Math.min(taskCount, 8) }, (_, i) => i);
  const truncated = taskCount > 8;

  // Calculate byte ranges for display
  const bytesPerInstance = inputDataSize > 0 ? Math.floor(inputDataSize / taskCount) : 0;
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  const getPercentRange = (index: number): string => {
    const start = Math.round((index / taskCount) * 100);
    const end = Math.round(((index + 1) / taskCount) * 100);
    return `${start}%–${end}%`;
  };

  // Color palette for instances
  const colors = [
    { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
    { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" },
    { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
    { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
    { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
    { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-500" },
    { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", dot: "bg-indigo-500" },
    { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", dot: "bg-teal-500" },
  ];

  const shortPath = (path: string) => {
    if (!path) return "gs://...";
    const parts = path.replace("gs://", "").split("/");
    if (parts.length > 3) return `gs://.../${parts.slice(-2).join("/")}`;
    return path;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">GCP Batch — Distributed Processing</h3>
          <p className="text-xs text-gray-500">
            {distributionMode === "BYTE_RANGE" ? "Byte-range" : distributionMode} distribution · {taskCount} instance{taskCount !== 1 ? "s" : ""}
            {inputDataSize > 0 && ` · ${formatBytes(inputDataSize)} input`}
          </p>
        </div>
      </div>

      {/* Architecture flow */}
      <div className="space-y-4">
        {/* Input file */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
          <svg className="h-5 w-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700">Shared Input (read-only)</p>
            <p className="text-xs text-gray-500 truncate font-mono">{shortPath(inputPath)}</p>
            {inputDataSize > 0 && <p className="text-xs text-gray-400">{formatBytes(inputDataSize)} · ~{formatBytes(bytesPerInstance)}/instance</p>}
            {inputDataSize === 0 && inputPath && (
              <p className="text-xs text-gray-400">Input size auto-detected from GCS metadata at submit time.</p>
            )}
          </div>
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Instance grid */}
        <div className={`grid gap-2 ${taskCount <= 2 ? "grid-cols-2" : taskCount <= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-4"}`}>
          {instances.map((i) => {
            const c = colors[i % colors.length];
            return (
              <div key={i} className={`rounded-lg border ${c.border} ${c.bg} px-3 py-2 space-y-1`}>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  <span className={`text-xs font-semibold ${c.text}`}>Instance {i}</span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono">
                  {distributionMode === "BYTE_RANGE" ? `bytes ${getPercentRange(i)}` : `task ${i}`}
                </p>
              </div>
            );
          })}
          {truncated && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 flex items-center justify-center">
              <span className="text-xs text-gray-400">+{taskCount - 8} more</span>
            </div>
          )}
        </div>

        {/* Arrow down */}
        <div className="flex justify-center">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Output files */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
          <svg className="h-5 w-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-700">Output ({taskCount} files)</p>
            <p className="text-xs text-gray-500 truncate font-mono">
              {shortPath(outputPath)}/instance-&#123;0..{taskCount - 1}&#125;.json
            </p>
          </div>
        </div>
      </div>

      {/* Performance estimate */}
      {inputDataSize > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-200">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{taskCount}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Instances</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{formatBytes(bytesPerInstance)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Per Instance</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{formatBytes(inputDataSize)}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Input</p>
          </div>
        </div>
      )}
    </div>
  );
}
