import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DWPArchitectureDiagram } from "@/components/DWPArchitectureDiagram";

// ─── DWP Pipeline Visualization Components ─────────────────────────────────

interface DwpJobContext {
  status: string;
  taskCount: number;
  inputDataSize: number;
  outputPath: string;
  createdAt: string;
  scheduledAt: string;
  startedAt: string;
  completedAt: string;
  errorMessage: string;
}

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
    <div className="flex items-start w-full">
      {PIPELINE_STEPS.map((step, i) => {
        const done = !failed && phase >= i + 1;
        const active = !failed && phase === i;
        const isFail = failed && i <= Math.max(statusToPhase("SCHEDULED"), 0) && failed;
        const isLast = i === PIPELINE_STEPS.length - 1;

        return (
          <div key={step} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center min-w-[24px]">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 transition-colors ${
                done   ? "bg-[#1a73e8] text-white" :
                active ? "border-2 border-[#1a73e8] text-[#1a73e8] bg-white" :
                isFail ? "bg-[#ea4335] text-white" :
                "bg-[#e8eaed] text-[#5f6368]"
              }`}>
                {done ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isFail ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className={`text-[10px] mt-1.5 text-center leading-tight max-w-[72px] ${
                done   ? "text-[#1a73e8] font-medium" :
                active ? "text-[#1a73e8] font-medium" :
                isFail ? "text-[#ea4335] font-medium" :
                "text-[#5f6368]"
              }`}>{step}</span>
            </div>
            {!isLast && (
              <div className={`h-[2px] flex-1 mt-[11px] mx-1.5 rounded-full ${
                done ? "bg-[#1a73e8]" : "bg-[#dadce0]"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatBytesCompact(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

const GOOGLE_COLORS = [
  { accent: "#1a73e8", bg: "#e8f0fe" },
  { accent: "#34a853", bg: "#e6f4ea" },
  { accent: "#f9ab00", bg: "#fef7e0" },
  { accent: "#ea4335", bg: "#fce8e6" },
  { accent: "#a142f4", bg: "#f3e8fd" },
  { accent: "#12b5cb", bg: "#e4f7fb" },
  { accent: "#fa903e", bg: "#fef1e6" },
  { accent: "#5f6368", bg: "#f1f3f4" },
];

function InstanceGrid({ job }: { job: DwpJobContext }) {
  const instances = Array.from({ length: Math.min(job.taskCount, 16) }, (_, i) => i);
  const bytesPerInstance = job.inputDataSize > 0 ? Math.floor(job.inputDataSize / job.taskCount) : 0;
  const totalBytes = job.inputDataSize;

  const isActive = job.status === "RUNNING" || job.status === "SCHEDULED";
  const isDone = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";
  const isPending = job.status === "PENDING";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-sm font-medium text-[#202124]">Parallel instances</span>
          <span className="text-sm text-[#5f6368]">({job.taskCount})</span>
        </div>
        {isDone && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#137333] bg-[#e6f4ea] px-3 py-1 rounded-full">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
        )}
        {isActive && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] px-3 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1a73e8] animate-pulse" />
            Running
          </span>
        )}
        {isFailed && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c5221f] bg-[#fce8e6] px-3 py-1 rounded-full">
            Error
          </span>
        )}
        {isPending && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5f6368] bg-[#f1f3f4] px-3 py-1 rounded-full">
            Pending
          </span>
        )}
      </div>

      {/* Data distribution */}
      {totalBytes > 0 && (
        <div className="bg-[#f8f9fa] rounded-lg p-4 border border-[#e8eaed]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#5f6368]">Data distribution</span>
            <span className="text-xs text-[#5f6368] font-mono">{formatBytesCompact(totalBytes)} total</span>
          </div>
          <div className="flex rounded h-2 overflow-hidden bg-[#dadce0]">
            {instances.map((idx) => {
              const c = GOOGLE_COLORS[idx % GOOGLE_COLORS.length];
              return (
                <div
                  key={idx}
                  className={`h-full ${isFailed ? "opacity-30" : ""}`}
                  style={{ width: `${100 / job.taskCount}%`, background: c.accent }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Instance cards */}
      <div className={`grid gap-3 ${
        job.taskCount <= 2 ? "grid-cols-1 sm:grid-cols-2" :
        "grid-cols-2 lg:grid-cols-4"
      }`}>
        {instances.map((idx) => {
          const startByte = bytesPerInstance * idx;
          const endByte = idx === job.taskCount - 1 ? totalBytes : bytesPerInstance * (idx + 1);
          const c = GOOGLE_COLORS[idx % GOOGLE_COLORS.length];

          return (
            <div
              key={idx}
              className="bg-white border border-[#dadce0] rounded-lg overflow-hidden hover:shadow-[0_1px_3px_rgba(60,64,67,0.3)] transition-shadow"
            >
              <div className="flex">
                <div className="w-1 shrink-0" style={{ background: isFailed ? "#dadce0" : c.accent }} />
                <div className="p-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#202124]">Instance {idx}</span>
                    <div className={`h-2 w-2 rounded-full ${
                      isDone   ? "bg-[#34a853]" :
                      isActive ? "bg-[#1a73e8]" :
                      isFailed ? "bg-[#ea4335]" :
                      "bg-[#dadce0]"
                    }`} />
                  </div>
                  {bytesPerInstance > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-[#5f6368] font-mono">{formatBytesCompact(endByte - startByte)}</p>
                      <div className="h-1 rounded-full bg-[#e8eaed] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: isDone ? "100%" : isActive ? "65%" : "0%",
                            background: c.accent,
                            opacity: isFailed ? 0.3 : 1,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#5f6368]">Auto-partitioned</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {job.taskCount > 16 && (
        <p className="text-xs text-[#5f6368] text-center">Showing 16 of {job.taskCount} instances</p>
      )}

      {/* Output files */}
      {isDone && job.outputPath && (
        <div className="bg-[#e6f4ea] border border-[#ceead6] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 text-[#137333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-[#137333]">Output files</span>
            <span className="text-xs text-[#137333] font-mono ml-auto">{job.outputPath}/</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {instances.map((idx) => (
              <span
                key={idx}
                className="text-xs font-mono text-[#137333] bg-white border border-[#ceead6] px-2.5 py-1 rounded"
              >
                instance-{idx}.json
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

const TIMELINE_EVENTS: {
  key: string;
  label: string;
  color: string;
  field: keyof DwpJobContext;
}[] = [
  { key: "submitted",  label: "Job submitted",      color: "#5f6368", field: "createdAt" },
  { key: "scheduled",  label: "VMs allocated",       color: "#a142f4", field: "scheduledAt" },
  { key: "started",    label: "Processing started",  color: "#1a73e8", field: "startedAt" },
  { key: "completed",  label: "All instances done",  color: "#34a853", field: "completedAt" },
];

function JobTimeline({ job }: { job: DwpJobContext }) {
  const events = TIMELINE_EVENTS
    .filter((e) => !!job[e.field])
    .map((e) => ({ ...e, time: job[e.field] as string }));

  if (job.errorMessage) {
    events.push({
      key: "error",
      label: "Error occurred",
      color: "#ea4335",
      field: "errorMessage",
      time: job.completedAt || job.createdAt,
    });
  }

  if (events.length === 0) return null;

  const startMs = job.createdAt ? new Date(job.createdAt).getTime() : 0;
  const endMs = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
  const totalElapsed = startMs > 0 ? endMs - startMs : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#202124]">Execution timeline</span>
        {totalElapsed > 0 && (
          <span className="text-xs text-[#5f6368] font-mono">
            {job.completedAt ? `Total: ${formatElapsed(totalElapsed)}` : `Elapsed: ${formatElapsed(totalElapsed)}`}
          </span>
        )}
      </div>

      <div className="relative ml-3">
        {/* Vertical connector */}
        <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-[#dadce0]" />

        <div className="space-y-0">
          {events.map((evt, i) => {
            const prevTime = i > 0 ? new Date(events[i - 1].time).getTime() : 0;
            const currTime = new Date(evt.time).getTime();
            const delta = prevTime > 0 ? currTime - prevTime : 0;
            const isError = evt.key === "error";

            return (
              <div key={evt.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                {/* Dot */}
                <div
                  className="relative z-10 h-4 w-4 rounded-full border-2 bg-white shrink-0"
                  style={{ borderColor: evt.color }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0 -mt-0.5">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className={`text-sm ${isError ? "text-[#c5221f] font-medium" : "text-[#202124]"}`}>
                      {evt.label}
                    </span>
                    <span className="text-xs text-[#5f6368] font-mono whitespace-nowrap">
                      {new Date(evt.time).toLocaleString(undefined, {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </span>
                  </div>
                  {delta > 0 && (
                    <p className="text-xs text-[#80868b] mt-0.5">+{formatElapsed(delta)}</p>
                  )}
                  {isError && job.errorMessage && (
                    <p className="text-xs text-[#c5221f] font-mono mt-1 break-all">{job.errorMessage}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface EnvVar {
  id: string;
  key: string;
  value: string;
  error?: string;
}

interface ViewJobFormProps {
  jobId?: string;
  jobName?: string;
  jobID?: string;
  containerLink?: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  gcpBatchJobPath?: string;
  commands?: string[];
  retryCount?: bigint;
  maxRetries?: bigint;
  // Resource fields from proto Job
  machineType?: string;
  resourceProfile?: string;
  bootDiskSizeGb?: bigint;
  useSpotVms?: boolean;
  serviceAccount?: string;
  duration?: number;
  envVars?: EnvVar[];
  status?:
    | "RUNNING"
    | "COMPLETED"
    | "PENDING"
    | "SCHEDULED"
    | "FAILED"
    | "CANCELLED";
  onBack?: () => void;
}

export function ViewJobForm({
  jobID,
  containerLink,
  createdAt,
  updatedAt,
  scheduledAt,
  startedAt,
  completedAt,
  errorMessage,
  gcpBatchJobPath,
  commands,
  retryCount,
  maxRetries,
  machineType,
  resourceProfile,
  bootDiskSizeGb,
  useSpotVms,
  serviceAccount,
  duration,
  envVars,
  status,
  onBack,
}: ViewJobFormProps) {
  const finalJobID = jobID;
  const finalContainerLink = containerLink;
  const finalEnvVars = envVars;

  // Detect DWP job from env vars
  const envMap = Object.fromEntries((finalEnvVars || []).map((ev) => [ev.key, ev.value]));
  const isDwpJob = envMap["ENABLE_DISTRIBUTED_MODE"] === "true";
  const dwpTaskCount = parseInt(envMap["JENNAH_TASK_COUNT"] || "0", 10);
  const dwpDistributionMode = envMap["DISTRIBUTION_MODE"] || "BYTE_RANGE";
  const dwpInputPath = envMap["INPUT_DATA_PATH"] || "";
  const dwpInputDataSize = parseInt(envMap["INPUT_DATA_SIZE"] || "0", 10);
  const dwpOutputPath = envMap["OUTPUT_BASE_PATH"] || "";

  // DWP-specific env var keys to filter from the general env table
  const DWP_ENV_KEYS = new Set([
    "ENABLE_DISTRIBUTED_MODE", "DISTRIBUTION_MODE", "INPUT_DATA_PATH",
    "INPUT_DATA_SIZE", "OUTPUT_BASE_PATH", "JENNAH_TASK_COUNT", "JENNAH_PARALLELISM",
  ]);
  const nonDwpEnvVars = isDwpJob
    ? (finalEnvVars || []).filter((ev) => !DWP_ENV_KEYS.has(ev.key))
    : finalEnvVars || [];

  // Build context object for DWP visualization components
  const dwpContext: DwpJobContext = {
    status: status || "PENDING",
    taskCount: dwpTaskCount,
    inputDataSize: dwpInputDataSize,
    outputPath: dwpOutputPath,
    createdAt: createdAt || "",
    scheduledAt: scheduledAt || "",
    startedAt: startedAt || "",
    completedAt: completedAt || "",
    errorMessage: errorMessage || "",
  };

  return (
    <div className="space-y-6 max-w-[960px]">

      {/* Error alert — Google style */}
      {errorMessage && (
        <div className="flex items-start gap-3 bg-[#fce8e6] border border-[#f5c6cb] rounded-lg px-4 py-3">
          <svg className="h-5 w-5 text-[#c5221f] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[#c5221f]">This job failed</p>
            <p className="text-sm text-[#5f6368] font-mono mt-1 break-all">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Overview card */}
      <div className="bg-white border border-[#dadce0] rounded-lg">
        <div className="px-6 py-4 border-b border-[#dadce0]">
          <h2 className="text-base font-medium text-[#202124]">Overview</h2>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-12">
            <div>
              <p className="text-xs text-[#5f6368] mb-1">Job ID</p>
              <p className="text-sm text-[#202124] font-mono">{finalJobID}</p>
            </div>
            <div>
              <p className="text-xs text-[#5f6368] mb-1">Container image</p>
              <p className="text-sm text-[#202124] font-mono break-all">{finalContainerLink}</p>
            </div>
            {machineType && (
              <div>
                <p className="text-xs text-[#5f6368] mb-1">Machine type</p>
                <p className="text-sm text-[#202124] font-mono">{machineType}</p>
              </div>
            )}
            {resourceProfile && (
              <div>
                <p className="text-xs text-[#5f6368] mb-1">Resource profile</p>
                <p className="text-sm text-[#202124] capitalize">{resourceProfile}</p>
              </div>
            )}
            {gcpBatchJobPath && (
              <div className="md:col-span-2">
                <p className="text-xs text-[#5f6368] mb-1">GCP Batch job</p>
                <p className="text-sm text-[#1a73e8] font-mono break-all">{gcpBatchJobPath}</p>
              </div>
            )}
          </div>

          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-[#e8eaed]">
            {createdAt && (
              <span className="inline-flex items-center gap-1.5 text-xs text-[#5f6368] bg-[#f1f3f4] px-2.5 py-1 rounded-full">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {bootDiskSizeGb !== undefined && bootDiskSizeGb > 0n && (
              <span className="text-xs text-[#5f6368] bg-[#f1f3f4] px-2.5 py-1 rounded-full">
                Disk: {String(bootDiskSizeGb)} GB
              </span>
            )}
            <span className="text-xs text-[#5f6368] bg-[#f1f3f4] px-2.5 py-1 rounded-full">
              {useSpotVms ? "Spot VM" : "On-demand"}
            </span>
            {(retryCount !== undefined && maxRetries !== undefined && maxRetries > 0n) && (
              <span className="text-xs text-[#5f6368] bg-[#f1f3f4] px-2.5 py-1 rounded-full">
                Retries: {String(retryCount)}/{String(maxRetries)}
              </span>
            )}
            {serviceAccount && (
              <span className="text-xs text-[#5f6368] bg-[#f1f3f4] px-2.5 py-1 rounded-full font-mono truncate max-w-xs">
                {serviceAccount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Distributed Processing (DWP jobs only) */}
      {isDwpJob && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[#202124] px-1">Distributed processing</h2>

          {/* Pipeline progress */}
          <div className="bg-white border border-[#dadce0] rounded-lg px-6 py-5">
            <PipelineProgress status={dwpContext.status} />
          </div>

          {/* DWP config */}
          <div className="bg-white border border-[#dadce0] rounded-lg px-6 py-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#e37400] bg-[#fef7e0] px-2.5 py-1 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f9ab00]" />
                DWP enabled
              </span>
              <span className="text-xs font-medium text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-1 rounded-full">
                {dwpDistributionMode.replace("_", " ")}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#5f6368] mb-1">Instances</p>
                <p className="text-sm text-[#202124] font-medium">{dwpTaskCount}</p>
              </div>
              <div>
                <p className="text-xs text-[#5f6368] mb-1">Input size</p>
                <p className="text-sm text-[#202124] font-mono">{dwpInputDataSize > 0 ? `${(dwpInputDataSize / 1048576).toFixed(1)} MB` : "Auto"}</p>
              </div>
              <div>
                <p className="text-xs text-[#5f6368] mb-1">Per instance</p>
                <p className="text-sm text-[#202124] font-mono">{dwpInputDataSize > 0 && dwpTaskCount > 0 ? `${(dwpInputDataSize / dwpTaskCount / 1048576).toFixed(1)} MB` : "—"}</p>
              </div>
            </div>
            <div className="border-t border-[#e8eaed] pt-4 space-y-3">
              <div>
                <p className="text-xs text-[#5f6368] mb-1">Input path</p>
                <p className="text-sm text-[#202124] font-mono break-all">{dwpInputPath}</p>
              </div>
              <div>
                <p className="text-xs text-[#5f6368] mb-1">Output path</p>
                <p className="text-sm text-[#202124] font-mono break-all">{dwpOutputPath}</p>
              </div>
            </div>
          </div>

          {/* Instance grid */}
          <div className="bg-white border border-[#dadce0] rounded-lg px-6 py-5">
            <InstanceGrid job={dwpContext} />
          </div>

          {/* Timeline */}
          <div className="bg-white border border-[#dadce0] rounded-lg px-6 py-5">
            <JobTimeline job={dwpContext} />
          </div>

          <DWPArchitectureDiagram
            taskCount={dwpTaskCount}
            inputPath={dwpInputPath}
            outputPath={dwpOutputPath}
            inputDataSize={dwpInputDataSize}
            distributionMode={dwpDistributionMode}
          />
        </div>
      )}

      {/* Configuration */}
      {((commands && commands.length > 0) || (nonDwpEnvVars && nonDwpEnvVars.length > 0)) && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[#202124] px-1">Configuration</h2>

          {commands && commands.length > 0 && (
            <div className="bg-white border border-[#dadce0] rounded-lg overflow-hidden">
              <div className="px-6 py-3 border-b border-[#dadce0] bg-[#f8f9fa]">
                <span className="text-xs text-[#5f6368] font-medium">Commands</span>
              </div>
              <div className="p-4 font-mono text-sm text-[#202124] bg-[#f8f9fa] space-y-0.5">
                {commands.map((cmd, i) => (
                  <p key={i} className="break-all">
                    <span className="text-[#80868b] select-none mr-2">$</span>{cmd}
                  </p>
                ))}
              </div>
            </div>
          )}

          {nonDwpEnvVars && nonDwpEnvVars.length > 0 && (
            <div className="bg-white border border-[#dadce0] rounded-lg overflow-hidden">
              <div className="px-6 py-3 border-b border-[#dadce0]">
                <span className="text-xs text-[#5f6368] font-medium">Environment variables</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-[#e8eaed]">
                    <TableHead className="text-xs text-[#5f6368] font-medium h-10">Key</TableHead>
                    <TableHead className="text-xs text-[#5f6368] font-medium h-10">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonDwpEnvVars.map((envVar) => (
                    <TableRow key={envVar.id} className="border-b border-[#e8eaed] hover:bg-[#f8f9fa]">
                      <TableCell className="text-sm text-[#202124] font-mono py-2.5">{envVar.key}</TableCell>
                      <TableCell className="text-sm text-[#5f6368] font-mono break-all py-2.5">{envVar.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Back */}
      {onBack && (
        <div className="pt-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1a73e8] hover:bg-[#e8f0fe] px-4 py-2 rounded-full transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
