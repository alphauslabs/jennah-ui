import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function formatBytesCompact(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}MB`;
  return `${(bytes / 1073741824).toFixed(1)}GB`;
}

function InstanceGrid({ job }: { job: DwpJobContext }) {
  const instances = Array.from({ length: Math.min(job.taskCount, 16) }, (_, i) => i);
  const bytesPerInstance = job.inputDataSize > 0 ? Math.floor(job.inputDataSize / job.taskCount) : 0;

  const instanceColors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
    "bg-blue-400", "bg-green-400", "bg-purple-400", "bg-amber-400",
    "bg-rose-400", "bg-cyan-400", "bg-indigo-400", "bg-teal-400",
  ];

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

function JobTimeline({ job }: { job: DwpJobContext }) {
  const events: { label: string; time: string; icon: string; color: string }[] = [];
  if (job.createdAt)    events.push({ label: "Submitted", time: job.createdAt, icon: "📤", color: "text-gray-600" });
  if (job.scheduledAt)  events.push({ label: "VMs Allocated", time: job.scheduledAt, icon: "🖥️", color: "text-purple-600" });
  if (job.startedAt)    events.push({ label: "Processing Started", time: job.startedAt, icon: "⚡", color: "text-blue-600" });
  if (job.completedAt)  events.push({ label: "All Instances Done", time: job.completedAt, icon: "✅", color: "text-green-600" });
  if (job.errorMessage) events.push({ label: "Error", time: job.completedAt || job.createdAt, icon: "❌", color: "text-red-600" });

  if (events.length === 0) return null;

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
  const finalDuration = duration;
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

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="space-y-8 max-w-auto">
      {/* Header */}
      {/* <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-semibold">{finalJobName}</h1>
            {finalStatus && (
              <Badge className={statusMap[finalStatus]?.className}>
                {statusMap[finalStatus]?.label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            View and manage your job configuration
          </p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
      </div> */}

      {/* Job Details Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Job Details</h2>
        </div>
        <div className="space-y-6 bg-card rounded-lg border p-6">
          {/* Error message shown when job has failed */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-red-700 uppercase mb-1">Failure Reason</p>
              <p className="text-sm text-red-700 font-mono break-all">{errorMessage}</p>
            </div>
          )}
          <div className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Job ID
            </span>
            <p className="text-base font-medium">{finalJobID}</p>
          </div>
          <div className="h-px bg-border" />
          <div className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Container Link
            </span>
            <p className="text-base font-medium break-all">
              {finalContainerLink}
            </p>
          </div>
          {createdAt && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Created At
                </span>
                <p className="text-base font-medium">
                  {new Date(createdAt).toLocaleString()}
                </p>
              </div>
            </>
          )}
          {scheduledAt && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Scheduled At</span>
                <p className="text-base font-medium">{new Date(scheduledAt).toLocaleString()}</p>
              </div>
            </>
          )}
          {startedAt && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Started At</span>
                <p className="text-base font-medium">{new Date(startedAt).toLocaleString()}</p>
              </div>
            </>
          )}
          {completedAt && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Completed At</span>
                <p className="text-base font-medium">{new Date(completedAt).toLocaleString()}</p>
              </div>
            </>
          )}
          {updatedAt && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Last Updated</span>
                <p className="text-base font-medium">{new Date(updatedAt).toLocaleString()}</p>
              </div>
            </>
          )}
          {gcpBatchJobPath && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">GCP Batch Job Path</span>
                <p className="text-base font-medium font-mono break-all">{gcpBatchJobPath}</p>
              </div>
            </>
          )}
          {(retryCount !== undefined && maxRetries !== undefined && maxRetries > 0n) && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Retries</span>
                <p className="text-base font-medium">{String(retryCount)} / {String(maxRetries)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Distributed Processing Section (shown only for DWP jobs) */}
      {isDwpJob && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">Distributed Processing</h2>
          </div>
          <div className="space-y-6">
            {/* Pipeline progress bar */}
            <div className="bg-card rounded-lg border p-6">
              <p className="text-xs font-semibold text-gray-700 mb-3">Pipeline Progress</p>
              <PipelineProgress status={dwpContext.status} />
            </div>

            {/* Config overview */}
            <div className="bg-card rounded-lg border p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  DWP Enabled
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                  {dwpDistributionMode.replace("_", " ")}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Instances</span>
                  <p className="text-base font-medium">{dwpTaskCount}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Input Size</span>
                  <p className="text-base font-medium font-mono">{dwpInputDataSize > 0 ? `${(dwpInputDataSize / 1048576).toFixed(1)} MB` : "Auto"}</p>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Per Instance</span>
                  <p className="text-base font-medium font-mono">{dwpInputDataSize > 0 && dwpTaskCount > 0 ? `${(dwpInputDataSize / dwpTaskCount / 1048576).toFixed(1)} MB` : "—"}</p>
                </div>
              </div>
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Input Path</span>
                <p className="text-base font-medium font-mono break-all">{dwpInputPath}</p>
              </div>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Output Path</span>
                <p className="text-base font-medium font-mono break-all">{dwpOutputPath}</p>
              </div>
            </div>

            {/* Instance grid visualization */}
            <div className="bg-card rounded-lg border p-6">
              <InstanceGrid job={dwpContext} />
            </div>

            {/* Execution timeline */}
            <div className="bg-card rounded-lg border p-6">
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
        </div>
      )}

      {/* Resources Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Resources</h2>
        </div>
        <div className="space-y-6 bg-card rounded-lg border p-6">
          {machineType && (
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Machine Type</span>
              <p className="text-base font-medium font-mono">{machineType}</p>
            </div>
          )}
          {resourceProfile && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Resource Profile</span>
                <p className="text-base font-medium capitalize">{resourceProfile}</p>
              </div>
            </>
          )}
          {bootDiskSizeGb !== undefined && bootDiskSizeGb > 0n && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Boot Disk Size</span>
                <p className="text-base font-medium">{String(bootDiskSizeGb)} GB</p>
              </div>
            </>
          )}
          <>
            <div className="h-px bg-border" />
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Spot VMs</span>
              <p className="text-base font-medium">{useSpotVms ? "Enabled" : "Disabled"}</p>
            </div>
          </>
          {serviceAccount && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Service Account</span>
                <p className="text-base font-medium break-all">{serviceAccount}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Configuration Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Configuration</h2>
        </div>
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <div className="grid gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Timeout Duration
              </span>
              <p className="text-base font-medium">
                {formatDuration(finalDuration || 0)}
              </p>
            </div>
          </div>
          {commands && commands.length > 0 && (
            <div className="bg-card rounded-lg border p-6">
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase mb-2">Commands</span>
                <div className="bg-gray-50 rounded-md p-3 font-mono text-sm space-y-1">
                  {commands.map((cmd, i) => (
                    <p key={i} className="break-all">{cmd}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-sm font-semibold">Environment Variables</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Key</TableHead>
                  <TableHead className="font-semibold">Value</TableHead>
                  <TableHead className="text-right font-semibold">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(nonDwpEnvVars).map((envVar) => {
                  return (
                    <TableRow key={envVar.id}>
                      <TableCell className="font-medium">
                        {envVar.key}
                      </TableCell>
                      <TableCell className="text-muted-foreground break-all">
                        {envVar.value}
                      </TableCell>
                      <TableCell className="text-right">
                        {envVar.error ? (
                          <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                            {envVar.error}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                            Valid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4">
        {onBack && (
          <Button size="lg" variant="outline" className="px-8" onClick={onBack}>
            Cancel
          </Button>
        )}
        {/* <Button size="lg" variant="outline" className="px-8" asChild>
          <Link to={`/jobs/${jobId}/edit`}>Edit</Link>
        </Button> */}
        {/* <Button size="lg" className="px-8">
          Run Job
        </Button> */}
      </div>
    </div>
  );
}
