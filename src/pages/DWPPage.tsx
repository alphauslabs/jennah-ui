import { NavigationBar } from "@/components/NavigationBar";
import { Button } from "@/components/ui/button";
import { DWPArchitectureDiagram } from "@/components/DWPArchitectureDiagram";
import { useListJobs } from "@/api/hooks/useListJobs";
import { useGetCurrentTenant } from "@/api/hooks/useGetCurrentTenant";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

interface DwpJobInfo {
  jobId: string;
  name: string;
  status: string;
  createdAt: string;
  scheduledAt: string;
  startedAt: string;
  completedAt: string;
  errorMessage: string;
  gcpBatchJobPath: string;
  taskCount: number;
  distributionMode: string;
  inputPath: string;
  inputDataSize: number;
  outputPath: string;
  imageUri: string;
}

function parseEnvVarsJson(json: string): Record<string, string> {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

// ─── Status & Progress Components ──────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; ring: string; icon: string; label: string }> = {
  COMPLETED: { bg: "bg-green-100", text: "text-green-800", ring: "ring-green-500", icon: "✓", label: "Completed" },
  RUNNING:   { bg: "bg-blue-100",  text: "text-blue-800",  ring: "ring-blue-500",  icon: "▶", label: "Running" },
  PENDING:   { bg: "bg-yellow-100",text: "text-yellow-800",ring: "ring-yellow-500",icon: "◦", label: "Pending" },
  SCHEDULED: { bg: "bg-purple-100",text: "text-purple-800",ring: "ring-purple-500",icon: "◷", label: "Scheduling VMs" },
  FAILED:    { bg: "bg-red-100",   text: "text-red-800",   ring: "ring-red-500",   icon: "✕", label: "Failed" },
  CANCELLED: { bg: "bg-gray-100",  text: "text-gray-600",  ring: "ring-gray-400",  icon: "—", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.CANCELLED;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

/** Maps job status to a pipeline phase (0–4). */
function statusToPhase(status: string): number {
  switch (status) {
    case "PENDING":   return 0;
    case "SCHEDULED": return 1;
    case "RUNNING":   return 2;
    case "COMPLETED": return 4;
    case "FAILED":    return -1;
    case "CANCELLED": return -1;
    default:          return 0;
  }
}

const PIPELINE_STEPS = ["Submitted", "Scheduling VMs", "Processing", "Writing Output", "Done"];

function PipelineProgress({ status }: { status: string }) {
  const phase = statusToPhase(status);
  const failed = status === "FAILED" || status === "CANCELLED";

  return (
    <div className="flex items-center gap-1 w-full">
      {PIPELINE_STEPS.map((step, i) => {
        const done = !failed && phase >= i + 1;
        const active = !failed && phase === i;
        const isFail = failed && i === Math.max(statusToPhase("SCHEDULED"), 0);
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                  done ? "bg-green-500" :
                  active ? "bg-blue-500 animate-pulse" :
                  isFail ? "bg-red-400" :
                  "bg-gray-200"
                }`}
              />
              <span className={`text-[9px] mt-1 whitespace-nowrap ${
                done ? "text-green-600 font-semibold" :
                active ? "text-blue-600 font-semibold" :
                isFail ? "text-red-500 font-semibold" :
                "text-gray-400"
              }`}>{step}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Visualizes each instance's byte-range slice with the overall job status. */
function InstanceGrid({ job }: { job: DwpJobInfo }) {
  const instances = Array.from({ length: Math.min(job.taskCount, 16) }, (_, i) => i);
  const bytesPerInstance = job.inputDataSize > 0 ? Math.floor(job.inputDataSize / job.taskCount) : 0;

  const instanceColors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
    "bg-blue-400", "bg-green-400", "bg-purple-400", "bg-amber-400",
    "bg-rose-400", "bg-cyan-400", "bg-indigo-400", "bg-teal-400",
  ];

  // For completed jobs, all instances are done; for running, show animation
  const isActive = job.status === "RUNNING" || job.status === "SCHEDULED";
  const isDone = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">
          Instance Status — {job.taskCount} parallel worker{job.taskCount !== 1 ? "s" : ""}
        </p>
        {isDone && (
          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            All {job.taskCount} instances completed
          </span>
        )}
        {isActive && (
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
            Processing on {job.taskCount} instances...
          </span>
        )}
        {isFailed && (
          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            Job failed
          </span>
        )}
      </div>

      <div className={`grid gap-1.5 ${
        job.taskCount <= 4 ? "grid-cols-4" :
        job.taskCount <= 8 ? "grid-cols-4 md:grid-cols-8" :
        "grid-cols-4 md:grid-cols-8"
      }`}>
        {instances.map((idx) => {
          const startPct = Math.round((idx / job.taskCount) * 100);
          const endPct = Math.round(((idx + 1) / job.taskCount) * 100);
          return (
            <div
              key={idx}
              className={`relative rounded-lg border p-2 text-center transition-all ${
                isDone ? "border-green-200 bg-green-50" :
                isActive ? "border-blue-200 bg-blue-50" :
                isFailed ? "border-red-200 bg-red-50" :
                "border-gray-200 bg-gray-50"
              }`}
            >
              {/* Instance indicator bar */}
              <div className={`h-1 rounded-full mb-1.5 ${
                isDone ? instanceColors[idx % instanceColors.length] :
                isActive ? `${instanceColors[idx % instanceColors.length]} animate-pulse` :
                isFailed ? "bg-red-300" :
                "bg-gray-300"
              }`} />
              <p className="text-[10px] font-bold text-gray-800">#{idx}</p>
              <p className="text-[9px] text-gray-500 font-mono">{startPct}%–{endPct}%</p>
              {bytesPerInstance > 0 && (
                <p className="text-[9px] text-gray-400 font-mono">{formatBytesCompact(bytesPerInstance)}</p>
              )}
              {/* Status dot */}
              <div className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${
                isDone ? "bg-green-500" :
                isActive ? "bg-blue-500 animate-pulse" :
                isFailed ? "bg-red-400" :
                "bg-gray-300"
              }`} />
            </div>
          );
        })}
      </div>
      {job.taskCount > 16 && (
        <p className="text-[10px] text-gray-400 text-center">
          Showing 16 of {job.taskCount} instances
        </p>
      )}

      {/* Output files visualization */}
      {isDone && job.outputPath && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 mt-2">
          <p className="text-[10px] font-semibold text-green-700 mb-1.5">Output Files Generated</p>
          <div className="flex flex-wrap gap-1.5">
            {instances.map((idx) => (
              <span key={idx} className="text-[9px] font-mono bg-white border border-green-200 text-green-700 px-1.5 py-0.5 rounded">
                instance-{idx}.json
              </span>
            ))}
          </div>
          <p className="text-[9px] text-green-600 mt-1.5 font-mono">{job.outputPath}/</p>
        </div>
      )}
    </div>
  );
}

function formatBytesCompact(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}MB`;
  return `${(bytes / 1073741824).toFixed(1)}GB`;
}

/** Timeline for job execution milestones. */
function JobTimeline({ job }: { job: DwpJobInfo }) {
  const events: { label: string; time: string; icon: string; color: string }[] = [];
  if (job.createdAt)    events.push({ label: "Submitted", time: job.createdAt, icon: "📤", color: "text-gray-600" });
  if (job.scheduledAt)  events.push({ label: "VMs Allocated", time: job.scheduledAt, icon: "🖥️", color: "text-purple-600" });
  if (job.startedAt)    events.push({ label: "Processing Started", time: job.startedAt, icon: "⚡", color: "text-blue-600" });
  if (job.completedAt)  events.push({ label: "All Instances Done", time: job.completedAt, icon: "✅", color: "text-green-600" });
  if (job.errorMessage) events.push({ label: "Error", time: job.completedAt || job.createdAt, icon: "❌", color: "text-red-600" });

  if (events.length === 0) return null;

  // Calculate elapsed time
  const start = job.createdAt ? new Date(job.createdAt).getTime() : 0;
  const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
  const elapsedMs = start > 0 ? end - start : 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedStr = elapsedSec >= 60
    ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`
    : `${elapsedSec}s`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">Execution Timeline</p>
        {elapsedMs > 0 && (
          <span className="text-[10px] font-mono text-gray-500">
            {job.completedAt ? `Total: ${elapsedStr}` : `Elapsed: ${elapsedStr}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0">
        {events.map((evt, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <span className="text-sm">{evt.icon}</span>
              <span className={`text-[9px] font-medium ${evt.color} whitespace-nowrap mt-0.5`}>{evt.label}</span>
              <span className="text-[8px] text-gray-400 font-mono">
                {new Date(evt.time).toLocaleTimeString()}
              </span>
            </div>
            {i < events.length - 1 && (
              <div className="h-px w-8 md:w-16 bg-gray-300 mx-1 self-center mb-5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DWPPage() {
  const { fetchJobs, jobs: backendJobs, loading } = useListJobs();
  const { getCurrentTenant, tenant } = useGetCurrentTenant();
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  useEffect(() => {
    getCurrentTenant();
    fetchJobs();
    const interval = setInterval(() => fetchJobs(), 8_000);
    return () => clearInterval(interval);
  }, []);

  // Filter to DWP jobs only
  const dwpJobs: DwpJobInfo[] = useMemo(() => {
    const tenantJobs = tenant
      ? (backendJobs || []).filter((j: any) => j.tenantId === tenant.tenantId)
      : backendJobs || [];

    return tenantJobs
      .map((job: any) => {
        const env = parseEnvVarsJson(job.envVarsJson);
        if (env["ENABLE_DISTRIBUTED_MODE"] !== "true") return null;
        return {
          jobId: job.jobId,
          name: job.name || job.imageUri?.split("/").pop() || job.jobId,
          status: job.status || "PENDING",
          createdAt: job.createdAt || "",
          scheduledAt: job.scheduledAt || "",
          startedAt: job.startedAt || "",
          completedAt: job.completedAt || "",
          errorMessage: job.errorMessage || "",
          gcpBatchJobPath: job.gcpBatchJobPath || "",
          taskCount: parseInt(env["JENNAH_TASK_COUNT"] || "1", 10),
          distributionMode: env["DISTRIBUTION_MODE"] || "BYTE_RANGE",
          inputPath: env["INPUT_DATA_PATH"] || "",
          inputDataSize: parseInt(env["INPUT_DATA_SIZE"] || "0", 10),
          outputPath: env["OUTPUT_BASE_PATH"] || "",
          imageUri: job.imageUri || "",
        } as DwpJobInfo;
      })
      .filter(Boolean) as DwpJobInfo[];
  }, [backendJobs, tenant]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  // Compute throughput for completed jobs
  const computeThroughput = (job: DwpJobInfo): string => {
    if (job.status !== "COMPLETED" || !job.startedAt || !job.completedAt || job.inputDataSize === 0) return "—";
    const durationSec = (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000;
    if (durationSec <= 0) return "—";
    const mbPerSec = (job.inputDataSize / 1048576) / durationSec;
    return `${mbPerSec.toFixed(1)} MB/s`;
  };

  const hasActiveJobs = dwpJobs.some((j) => j.status === "RUNNING" || j.status === "SCHEDULED");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavigationBar />
      <main className="px-8 md:px-40 py-20 grow">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-semibold text-black mb-4 leading-tight">
            Distributed Processing
          </h1>
          <p className="text-xl text-gray-600 font-light">
            Split large datasets across multiple parallel GCP Batch instances for high-throughput processing.
          </p>
          <Link
            to="/jobs"
            className="text-blue-600 hover:text-blue-800 font-medium mt-4 inline-block"
          >
            <ChevronLeftIcon className="w-4 h-4 inline mr-2" />
            Back to Jobs
          </Link>
        </div>

        {/* Live activity banner */}
        {hasActiveJobs && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-6 py-4 mb-8 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-sm font-medium text-blue-800">
              {dwpJobs.filter((j) => j.status === "RUNNING").length} job(s) actively processing across{" "}
              {dwpJobs.filter((j) => j.status === "RUNNING").reduce((s, j) => s + j.taskCount, 0)} instances —
              auto-refreshing every 8s
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total DWP Jobs</p>
            <p className="text-3xl font-bold text-gray-900">{dwpJobs.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Running</p>
            <p className="text-3xl font-bold text-blue-600">{dwpJobs.filter((j) => j.status === "RUNNING").length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-600">{dwpJobs.filter((j) => j.status === "COMPLETED").length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Failed</p>
            <p className="text-3xl font-bold text-red-600">{dwpJobs.filter((j) => j.status === "FAILED").length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Instances</p>
            <p className="text-3xl font-bold text-orange-600">{dwpJobs.reduce((sum, j) => sum + j.taskCount, 0)}</p>
          </div>
        </div>

        {/* Create DWP Job CTA */}
        <div className="rounded-xl border bg-gradient-to-r from-gray-50 to-white p-8 mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Create a Distributed Job</h2>
              <p className="text-gray-600 text-sm max-w-xl">
                Configure a new distributed workload with byte-range splitting, parallel instances,
                and automatic GCS input/output management. Jobs are routed to GCP Cloud Batch.
              </p>
            </div>
            <Link to="/jobs/create">
              <Button size="lg" className="px-8">
                New DWP Job
              </Button>
            </Link>
          </div>
        </div>

        {/* DWP Jobs — Card-based with expandable details */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">DWP Jobs</h2>
          {loading && (
            <div className="text-center py-10">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <div className="h-4 w-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                Loading jobs...
              </div>
            </div>
          )}
          {!loading && dwpJobs.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm mb-4">No distributed processing jobs yet.</p>
              <Link to="/jobs/create">
                <Button>Create Your First DWP Job</Button>
              </Link>
            </div>
          )}
          {!loading && dwpJobs.length > 0 && (
            <div className="space-y-4">
              {dwpJobs.map((job) => {
                const isExpanded = expandedJob === job.jobId;
                return (
                  <div
                    key={job.jobId}
                    className={`rounded-xl border transition-all ${
                      job.status === "RUNNING" ? "border-blue-200 shadow-sm shadow-blue-100" :
                      job.status === "COMPLETED" ? "border-green-200" :
                      job.status === "FAILED" ? "border-red-200" :
                      "border-gray-200"
                    }`}
                  >
                    {/* Card header */}
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Link to={`/jobs/${job.jobId}`} className="font-semibold text-blue-600 hover:text-blue-800">
                            {job.name}
                          </Link>
                          <StatusBadge status={job.status} />
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
                            {job.distributionMode}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {job.taskCount} instance{job.taskCount !== 1 ? "s" : ""} · {formatBytes(job.inputDataSize)}
                              {job.status === "COMPLETED" && ` · ${computeThroughput(job)} throughput`}
                            </p>
                          </div>
                          <button
                            onClick={() => setExpandedJob(isExpanded ? null : job.jobId)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                          >
                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </button>
                        </div>
                      </div>

                      {/* Pipeline progress bar — always visible */}
                      <PipelineProgress status={job.status} />

                      {/* Error message inline */}
                      {job.errorMessage && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
                          <p className="text-xs font-semibold text-red-700 mb-0.5">Error</p>
                          <p className="text-xs text-red-600 font-mono break-all">{job.errorMessage}</p>
                        </div>
                      )}
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="border-t px-6 py-5 bg-gray-50/50 space-y-5">
                        {/* Instance grid */}
                        <InstanceGrid job={job} />

                        {/* Timeline */}
                        <JobTimeline job={job} />

                        {/* Metadata grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-lg border bg-white p-3">
                            <p className="text-[10px] font-medium text-gray-400 uppercase">Image</p>
                            <p className="text-xs font-mono text-gray-700 truncate" title={job.imageUri}>{job.imageUri.split("/").pop()}</p>
                          </div>
                          <div className="rounded-lg border bg-white p-3">
                            <p className="text-[10px] font-medium text-gray-400 uppercase">Input</p>
                            <p className="text-xs font-mono text-gray-700 truncate" title={job.inputPath}>
                              {job.inputPath ? job.inputPath.replace("gs://", "").split("/").slice(-1)[0] : "—"}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-white p-3">
                            <p className="text-[10px] font-medium text-gray-400 uppercase">Output</p>
                            <p className="text-xs font-mono text-gray-700 truncate" title={job.outputPath}>
                              {job.outputPath ? job.outputPath.replace("gs://", "").split("/").slice(-1)[0] + "/" : "—"}
                            </p>
                          </div>
                          <div className="rounded-lg border bg-white p-3">
                            <p className="text-[10px] font-medium text-gray-400 uppercase">GCP Batch Path</p>
                            <p className="text-xs font-mono text-gray-700 truncate" title={job.gcpBatchJobPath}>
                              {job.gcpBatchJobPath ? job.gcpBatchJobPath.split("/").pop() : "—"}
                            </p>
                          </div>
                        </div>

                        {/* Architecture diagram for this specific job */}
                        <DWPArchitectureDiagram
                          taskCount={job.taskCount}
                          inputPath={job.inputPath}
                          outputPath={job.outputPath}
                          inputDataSize={job.inputDataSize}
                          distributionMode={job.distributionMode}
                        />

                        <div className="flex justify-end">
                          <Link to={`/jobs/${job.jobId}`}>
                            <Button variant="outline" size="sm">View Full Details</Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reference Card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 mb-12">
          <h2 className="text-xl font-semibold mb-4">Environment Variables Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-8 text-xs font-semibold text-muted-foreground uppercase">Variable</th>
                  <th className="text-left py-2 pr-8 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { key: "BATCH_TASK_INDEX", desc: "Instance ID (0-based, auto-injected by GCP)", example: "0, 1, 2, 3" },
                  { key: "BATCH_TASK_COUNT", desc: "Total instances (auto-injected by GCP)", example: "4" },
                  { key: "INPUT_DATA_PATH", desc: "GCS path to shared input file", example: "gs://bucket/input/data.txt" },
                  { key: "INPUT_DATA_SIZE", desc: "Optional file size in bytes; omitted values are auto-detected from GCS", example: "86888890" },
                  { key: "OUTPUT_BASE_PATH", desc: "GCS prefix for output files", example: "gs://bucket/output" },
                  { key: "DISTRIBUTION_MODE", desc: "How data is split across instances", example: "BYTE_RANGE or RECORD" },
                  { key: "ENABLE_DISTRIBUTED_MODE", desc: "Enable distributed processing", example: "true" },
                ].map((row) => (
                  <tr key={row.key}>
                    <td className="py-2 pr-8 font-mono text-xs font-medium">{row.key}</td>
                    <td className="py-2 pr-8 text-gray-600">{row.desc}</td>
                    <td className="py-2 font-mono text-xs text-gray-500">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
