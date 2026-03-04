import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSubmitJob } from "@/api/hooks/useSubmitJob";
import { useNavigate } from "react-router-dom";
import { create } from "@bufbuild/protobuf";
import { ResourceOverrideSchema, SubmitJobRequestSchema } from "@/gen/proto/jennah_pb";
import ChevronDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronUpIcon from "@mui/icons-material/KeyboardArrowUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { DWPArchitectureDiagram } from "@/components/DWPArchitectureDiagram";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComputeMethod = "quick-preset" | "custom-machine-type";

interface EnvVar {
  id: string;
  key: string;
  value: string;
  sensitive: boolean;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Maps UI preset IDs → API resource_profile strings expected by the Gateway.
// UI "Heavy" → API "large", UI "GPU" → API "xlarge" (matching API doc spec)
const PRESET_PROFILE_MAP: Record<string, string> = {
  small:  "small",
  medium: "medium",
  heavy:  "large",
  gpu:    "xlarge",
};

const PRESETS = [
  { id: "small",  label: "Small",  desc: "1 vCPU · 2 GiB · 30 min max" },
  { id: "medium", label: "Medium", desc: "2 vCPU · 4 GiB · 1 hr max" },
  { id: "heavy",  label: "Heavy",  desc: "4 vCPU · 8 GiB · 2 hr max" },
  { id: "gpu",    label: "GPU",    desc: "8 vCPU · 16 GiB · 4 hr max" },
];

// Maps custom machine type selection → cpu_millis and memory_mib for resource_override.
// The Gateway uses these raw values when no resource_profile is set.
const MACHINE_RESOURCES: Record<string, { cpuMillis: number; memoryMib: number; label: string }> = {
  "e2-micro":        { cpuMillis: 250,   memoryMib: 1024,  label: "0.25 vCPU · 1 GiB" },
  "e2-standard-2":   { cpuMillis: 2000,  memoryMib: 8192,  label: "2 vCPU · 8 GiB" },
  "e2-standard-4":   { cpuMillis: 4000,  memoryMib: 16384, label: "4 vCPU · 16 GiB" },
  "n1-standard-16":  { cpuMillis: 16000, memoryMib: 60416, label: "16 vCPU · 60 GiB" },
  "n1-standard-8+gpu": { cpuMillis: 8000, memoryMib: 30720, label: "8 vCPU · 30 GiB + GPU" },
};

const CUSTOM_MACHINES = Object.keys(MACHINE_RESOURCES);

// Resolved resource values for each preset (matches backend navigator package).
// Used by the frontend classifier to predict routing tier before submission.
const PRESET_RESOLVED: Record<string, { cpuMillis: number; memoryMib: number; defaultDurationSeconds: number }> = {
  small:  { cpuMillis: 1000,  memoryMib: 2048,  defaultDurationSeconds: 1800  },
  medium: { cpuMillis: 2000,  memoryMib: 4096,  defaultDurationSeconds: 3600  },
  large:  { cpuMillis: 4000,  memoryMib: 8192,  defaultDurationSeconds: 7200  },
  xlarge: { cpuMillis: 8000,  memoryMib: 16384, defaultDurationSeconds: 14400 },
};

// Backend thresholds (router package — mirrors exact values from backend docs)
const SIMPLE_MAX_CPU   = 500;
const SIMPLE_MAX_MEM   = 512;
const SIMPLE_MAX_DUR   = 600;
const MEDIUM_MAX_CPU   = 4000;
const MEDIUM_MAX_MEM   = 8192;
const MEDIUM_MAX_DUR   = 3600;

type RoutingTier = "SIMPLE" | "MEDIUM" | "COMPLEX";
interface RoutingDecision {
  tier: RoutingTier;
  service: "Cloud Tasks" | "Cloud Run Jobs" | "Cloud Batch";
  reason: string;
}

/**
 * Mirrors the backend router package's classification logic.
 * timeoutSeconds = 0 means "use preset default" — we resolve it for accurate prediction.
 */
function classifyRouting(
  computeMethod: ComputeMethod,
  preset: string,
  customMachine: string,
  timeoutSeconds: number,
): RoutingDecision {
  // Any explicit machine_type → COMPLEX regardless of resources
  if (computeMethod === "custom-machine-type") {
    const res = MACHINE_RESOURCES[customMachine];
    return {
      tier: "COMPLEX",
      service: "Cloud Batch",
      reason: `Explicit machine_type "${customMachine}" (${res?.label}) always routes to Cloud Batch.`,
    };
  }

  // Preset path — resolve real numbers
  const resolved = PRESET_RESOLVED[PRESET_PROFILE_MAP[preset]] ?? PRESET_RESOLVED["medium"];
  const effectiveDuration = timeoutSeconds > 0 ? timeoutSeconds : resolved.defaultDurationSeconds;

  const cpu = resolved.cpuMillis;
  const mem = resolved.memoryMib;
  const dur = effectiveDuration;

  if (cpu <= SIMPLE_MAX_CPU && mem <= SIMPLE_MAX_MEM && dur <= SIMPLE_MAX_DUR) {
    return {
      tier: "SIMPLE",
      service: "Cloud Tasks",
      reason: `${cpu} mCPU, ${mem} MiB, ${dur}s — within SIMPLE limits (≤500 mCPU, ≤512 MiB, ≤600s).`,
    };
  }

  if (cpu <= MEDIUM_MAX_CPU && mem <= MEDIUM_MAX_MEM && dur <= MEDIUM_MAX_DUR) {
    return {
      tier: "MEDIUM",
      service: "Cloud Run Jobs",
      reason: `${cpu} mCPU, ${mem} MiB, ${dur}s — within MEDIUM limits (≤4000 mCPU, ≤8192 MiB, ≤3600s).`,
    };
  }

  // Exceeds MEDIUM thresholds
  const reasons: string[] = [];
  if (cpu > MEDIUM_MAX_CPU) reasons.push(`CPU ${cpu} mCPU > 4000`);
  if (mem > MEDIUM_MAX_MEM) reasons.push(`memory ${mem} MiB > 8192`);
  if (dur > MEDIUM_MAX_DUR) reasons.push(`duration ${dur}s > 3600`);
  return {
    tier: "COMPLEX",
    service: "Cloud Batch",
    reason: `Exceeds MEDIUM limits: ${reasons.join(", ")}.`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Combines h/m/s into total seconds for resource_override.max_run_duration_seconds. */
function resolveDurationSeconds(hours: number, minutes: number, seconds: number): number {
  return hours * 3600 + minutes * 60 + seconds;
}

function isGpuSelected(method: ComputeMethod, preset: string, custom: string): boolean {
  if (method === "quick-preset") return preset === "gpu";
  return custom.includes("gpu");
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

const TIER_STYLES: Record<RoutingTier, { bg: string; border: string; badge: string; dot: string }> = {
  SIMPLE:  { bg: "bg-blue-50",  border: "border-blue-200",  badge: "bg-blue-100 text-blue-800",   dot: "bg-blue-500" },
  MEDIUM:  { bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-800",  dot: "bg-green-500" },
  COMPLEX: { bg: "bg-orange-50",border: "border-orange-200",badge: "bg-orange-100 text-orange-800",dot: "bg-orange-500" },
};

function RoutingPreview({ decision }: { decision: RoutingDecision }) {
  const s = TIER_STYLES[decision.tier];
  return (
    <div className={`rounded-lg border ${s.bg} ${s.border} px-4 py-3 space-y-2`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${s.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
          {decision.tier}
        </span>
        <span className="text-xs font-medium text-gray-700">→ {decision.service}</span>
      </div>
      <p className="text-xs text-gray-500">{decision.reason}</p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="text-left">
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronUpIcon fontSize="small" /> : <ChevronDownIcon fontSize="small" />}
      </button>
      {open && <div className="px-6 pb-6 pt-2 space-y-5 border-t">{children}</div>}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function NewJobForm() {
  const navigate = useNavigate();
  const { submitJob, loading, error } = useSubmitJob();

  // Basic Info
  const [jobName, setJobName] = useState("");
  const [containerImage, setContainerImage] = useState("");

  // Compute
  const [computeMethod, setComputeMethod] = useState<ComputeMethod>("quick-preset");
  const [preset, setPreset] = useState("medium");
  const [customMachine, setCustomMachine] = useState("e2-standard-4");

  // Configuration (Priority 1 — expanded)
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [maxRetries, setMaxRetries] = useState(3);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  // Advanced Resources (Priority 2 — collapsed)
  const [bootDiskSize, setBootDiskSize] = useState(50);
  const [useSpotVMs, setUseSpotVMs] = useState(false);

  // Advanced Security & Logging (Priority 3 — collapsed)
  const [serviceAccount, setServiceAccount] = useState("");
  const [streamLogs, setStreamLogs] = useState(true);

  // Distributed Workload Processing (DWP)
  const [dwpEnabled, setDwpEnabled] = useState(false);
  const [dwpTaskCount, setDwpTaskCount] = useState(4);
  const [dwpDistributionMode, setDwpDistributionMode] = useState("BYTE_RANGE");
  const [dwpInputPath, setDwpInputPath] = useState("");
  const [dwpInputDataSize, setDwpInputDataSize] = useState(0);
  const [dwpOutputPath, setDwpOutputPath] = useState("");

  // Success state — shown after submit before navigating away
  const [successInfo, setSuccessInfo] = useState<{
    jobId: string;
    workerAssigned: string;
    complexityLevel: string;
    assignedService: string;
    routingReason: string;
  } | null>(null);

  // Derived
  const gpuSelected = isGpuSelected(computeMethod, preset, customMachine);
  const spotDisabled = gpuSelected;
  const timeoutSeconds = resolveDurationSeconds(hours, minutes, seconds);
  // DWP always routes to COMPLEX/Cloud Batch
  const routingDecision = dwpEnabled
    ? { tier: "COMPLEX" as RoutingTier, service: "Cloud Batch" as const, reason: `Distributed processing: ${dwpTaskCount} parallel instances with ${dwpDistributionMode} distribution → Cloud Batch.` }
    : classifyRouting(computeMethod, preset, customMachine, timeoutSeconds);

  // ─── Validation ───────────────────────────────────────────────────────────

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!jobName.trim()) errs.jobName = "Job name is required.";
    if (!containerImage.trim()) errs.containerImage = "Container image URI is required.";
    if (hours < 0 || hours > 4 || !Number.isInteger(hours)) errs.hours = "Hours: 0–4.";
    if (minutes < 0 || minutes > 59 || !Number.isInteger(minutes)) errs.minutes = "Minutes: 0–59.";
    if (seconds < 0 || seconds > 59 || !Number.isInteger(seconds)) errs.seconds = "Seconds: 0–59.";
    if (maxRetries < 1 || maxRetries > 5 || !Number.isInteger(maxRetries)) errs.maxRetries = "Max retries: 1–5.";
    if (bootDiskSize < 10 || bootDiskSize > 100 || !Number.isInteger(bootDiskSize)) errs.bootDisk = "Boot disk: 10–100 GB.";
    if (serviceAccount && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(serviceAccount)) errs.serviceAccount = "Must be a valid email format.";
    // DWP validation
    if (dwpEnabled) {
      if (dwpTaskCount < 1 || dwpTaskCount > 100 || !Number.isInteger(dwpTaskCount)) errs.dwpTaskCount = "Task count: 1–100.";
      if (!dwpInputPath.trim()) errs.dwpInputPath = "Input data path is required for distributed processing.";
      else if (!dwpInputPath.startsWith("gs://")) errs.dwpInputPath = "Must be a GCS path starting with gs://";
      if (dwpInputDataSize < 0) errs.dwpInputDataSize = "Input data size must be ≥ 0.";
      if (!dwpOutputPath.trim()) errs.dwpOutputPath = "Output base path is required for distributed processing.";
      else if (!dwpOutputPath.startsWith("gs://")) errs.dwpOutputPath = "Must be a GCS path starting with gs://";
    }
    envVars.forEach((ev, i) => {
      if (ev.key && !/^\w+$/.test(ev.key)) errs[`envKey_${i}`] = `Key "${ev.key}" must be alphanumeric/underscore only.`;
    });
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const envVarsMap: Record<string, string> = {};
      envVars.forEach((ev) => { if (ev.key) envVarsMap[ev.key] = ev.value; });

      // Inject DWP environment variables when distributed processing is enabled
      if (dwpEnabled) {
        envVarsMap["ENABLE_DISTRIBUTED_MODE"] = "true";
        envVarsMap["DISTRIBUTION_MODE"] = dwpDistributionMode;
        envVarsMap["INPUT_DATA_PATH"] = dwpInputPath;
        envVarsMap["INPUT_DATA_SIZE"] = String(dwpInputDataSize);
        envVarsMap["OUTPUT_BASE_PATH"] = dwpOutputPath;
        envVarsMap["JOB_ID"] = jobName || "dwp-job";
        // Task group hints for the backend to configure parallelism
        envVarsMap["JENNAH_TASK_COUNT"] = String(dwpTaskCount);
        envVarsMap["JENNAH_PARALLELISM"] = String(dwpTaskCount);
      }

      // timeoutSeconds is already computed in derived state above
      let request;
      if (computeMethod === "quick-preset") {
        // Preset path: send resource_profile + timeout override only.
        // CPU/memory come from the preset on the backend side.
        request = create(SubmitJobRequestSchema, {
          imageUri: containerImage,
          name: jobName,
          envVars: envVarsMap,
          serviceAccount: serviceAccount || "",
          resourceProfile: PRESET_PROFILE_MAP[preset] ?? "medium",
          resourceOverride: create(ResourceOverrideSchema, {
            maxRunDurationSeconds: BigInt(timeoutSeconds),
            cpuMillis: BigInt(0),
            memoryMib: BigInt(0),
          }),
        });
      } else {
        // Custom machine path: convert machine string to raw cpu/memory numbers.
        // Do not send resource_profile — resource_override takes full precedence.
        const resources = MACHINE_RESOURCES[customMachine] ?? MACHINE_RESOURCES["e2-standard-4"];
        request = create(SubmitJobRequestSchema, {
          imageUri: containerImage,
          name: jobName,
          envVars: envVarsMap,
          serviceAccount: serviceAccount || "",
          resourceOverride: create(ResourceOverrideSchema, {
            cpuMillis: BigInt(resources.cpuMillis),
            memoryMib: BigInt(resources.memoryMib),
            maxRunDurationSeconds: BigInt(timeoutSeconds),
          }),
        });
      }

      const res = await submitJob(request);
      const fullJobId = res?.jobId ?? "";
      console.info("Submitted job, full UUID:", fullJobId);

      // Show success banner with routing details, then navigate
      setSuccessInfo({
        jobId: fullJobId,
        workerAssigned: res?.workerAssigned ?? "",
        complexityLevel: res?.complexityLevel ?? "",
        assignedService: res?.assignedService ?? "",
        routingReason: res?.routingReason ?? "",
      });
      setTimeout(() => navigate("/jobs"), 4000);
    } catch (err) {
      console.error("Failed to submit job:", err);
    }
  };

  // ─── Env Var Helpers ──────────────────────────────────────────────────────

  const addEnvVar = () =>
    setEnvVars((v) => [...v, { id: crypto.randomUUID(), key: "", value: "", sensitive: false }]);

  const updateEnvVar = (id: string, field: keyof EnvVar, value: string | boolean) =>
    setEnvVars((v) => v.map((ev) => (ev.id === id ? { ...ev, [field]: value } : ev)));

  const removeEnvVar = (id: string) =>
    setEnvVars((v) => v.filter((ev) => ev.id !== id));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── 1. Basic Information (always visible) ── */}
      <Section title="Basic Information" subtitle="Job name and container image URI.">
        <div className="grid gap-2">
          <Label htmlFor="job-name">Job Name <span className="text-red-500">*</span></Label>
          <Input
            id="job-name"
            placeholder="e.g., data-pipeline-v1"
            value={jobName}
            maxLength={54}
            onChange={(e) => {
              const safe = e.target.value
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
              setJobName(safe);
            }}
          />
          {validationErrors.jobName && <p className="text-xs text-red-500">{validationErrors.jobName}</p>}
          <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only. Max 54 chars.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="container-image">Container Image URI <span className="text-red-500">*</span></Label>
          <Input
            id="container-image"
            placeholder="gcr.io/my-project/etl:latest"
            value={containerImage}
            onChange={(e) => setContainerImage(e.target.value)}
          />
          {validationErrors.containerImage && <p className="text-xs text-red-500">{validationErrors.containerImage}</p>}
          <p className="text-xs text-muted-foreground">Recommend pinning a sha256 digest for security.</p>
        </div>
      </Section>

      {/* ── 2. Compute Resources (always visible) ── */}
      <Section title="Compute Resources" subtitle="Choose how to specify compute requirements.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Option A: Quick Preset */}
          <div
            className={`rounded-lg border p-4 cursor-pointer transition-colors ${computeMethod === "quick-preset" ? "border-black bg-gray-50" : "border-gray-200"}`}
            onClick={() => setComputeMethod("quick-preset")}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${computeMethod === "quick-preset" ? "border-black" : "border-gray-300"}`}>
                {computeMethod === "quick-preset" && <div className="h-2 w-2 rounded-full bg-black" />}
              </div>
              <span className="font-medium text-sm">Quick Preset</span>
            </div>
            <select
              disabled={computeMethod !== "quick-preset"}
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className={`w-full text-sm border rounded-md px-3 py-2 bg-white transition-colors ${computeMethod !== "quick-preset" ? "text-gray-400 cursor-not-allowed" : "text-black"}`}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>
              ))}
            </select>
            {computeMethod === "quick-preset" && (
              <p className="text-xs text-muted-foreground mt-2">
                {PRESETS.find((p) => p.id === preset)?.desc}
                <span className="ml-2 font-mono text-xs bg-gray-100 px-1 rounded">
                  profile: {PRESET_PROFILE_MAP[preset]}
                </span>
              </p>
            )}
          </div>

          {/* Option B: Custom Machine Type */}
          <div
            className={`rounded-lg border p-4 cursor-pointer transition-colors ${computeMethod === "custom-machine-type" ? "border-black bg-gray-50" : "border-gray-200"}`}
            onClick={() => setComputeMethod("custom-machine-type")}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${computeMethod === "custom-machine-type" ? "border-black" : "border-gray-300"}`}>
                {computeMethod === "custom-machine-type" && <div className="h-2 w-2 rounded-full bg-black" />}
              </div>
              <span className="font-medium text-sm">Custom Machine Type</span>
            </div>
            <select
              disabled={computeMethod !== "custom-machine-type"}
              value={customMachine}
              onChange={(e) => setCustomMachine(e.target.value)}
              className={`w-full text-sm border rounded-md px-3 py-2 bg-white transition-colors ${computeMethod !== "custom-machine-type" ? "text-gray-400 cursor-not-allowed" : "text-black"}`}
            >
              {CUSTOM_MACHINES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {computeMethod === "custom-machine-type" && (
              <p className="text-xs text-muted-foreground mt-2">
                {MACHINE_RESOURCES[customMachine]?.label ?? customMachine}
              </p>
            )}
          </div>
        </div>

        {/* Routing tier preview — reacts live to compute + timeout state */}
        <RoutingPreview decision={routingDecision} />
      </Section>

      {/* ── 2b. Distributed Workload Processing ── */}
      <Section
        title="Distributed Processing"
        subtitle="Split work across multiple parallel instances using GCP Batch."
        defaultOpen={false}
      >
        {/* Enable toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDwpEnabled((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${dwpEnabled ? "bg-black" : "bg-gray-200"} cursor-pointer`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${dwpEnabled ? "translate-x-4" : ""}`} />
          </button>
          <div>
            <Label>Enable Distributed Workload Processing</Label>
            <p className="text-xs text-muted-foreground">
              Automatically split input data across multiple GCP Batch instances for parallel processing.
            </p>
          </div>
        </div>

        {dwpEnabled && (
          <div className="space-y-5 pt-2">
            {/* DWP info banner */}
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  COMPLEX
                </span>
                <span className="text-xs font-medium text-gray-700">→ Cloud Batch (required for DWP)</span>
              </div>
              <p className="text-xs text-gray-500">
                Distributed processing always routes to GCP Cloud Batch with multi-instance task groups.
              </p>
            </div>

            {/* Task Count */}
            <div className="grid gap-2">
              <Label htmlFor="dwp-task-count">
                Task Count (Instances) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dwp-task-count"
                type="number"
                min={1}
                max={100}
                value={dwpTaskCount}
                onChange={(e) => setDwpTaskCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-40"
              />
              {validationErrors.dwpTaskCount && <p className="text-xs text-red-500">{validationErrors.dwpTaskCount}</p>}
              <p className="text-xs text-muted-foreground">
                Number of parallel instances (1–100). Each instance processes a portion of the input data.
              </p>
            </div>

            {/* Distribution Mode */}
            <div className="grid gap-2">
              <Label>Distribution Mode</Label>
              <select
                value={dwpDistributionMode}
                onChange={(e) => setDwpDistributionMode(e.target.value)}
                className="w-full text-sm border rounded-md px-3 py-2 bg-white text-black"
              >
                <option value="BYTE_RANGE">Byte Range — split file by byte offsets</option>
                <option value="LINE_BASED">Line Based — split file by line count</option>
                <option value="ROUND_ROBIN">Round Robin — distribute records evenly</option>
              </select>
              <p className="text-xs text-muted-foreground">
                BYTE_RANGE is recommended for large files. Each instance gets a contiguous byte range.
              </p>
            </div>

            {/* Input Data Path */}
            <div className="grid gap-2">
              <Label htmlFor="dwp-input-path">
                Input Data Path (GCS) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dwp-input-path"
                placeholder="gs://my-bucket/input/data.txt"
                value={dwpInputPath}
                onChange={(e) => setDwpInputPath(e.target.value)}
                className="font-mono text-sm"
              />
              {validationErrors.dwpInputPath && <p className="text-xs text-red-500">{validationErrors.dwpInputPath}</p>}
              <p className="text-xs text-muted-foreground">
                GCS path to the shared input file. All instances read from this path.
              </p>
            </div>

            {/* Input Data Size */}
            <div className="grid gap-2">
              <Label htmlFor="dwp-input-size">Input Data Size (bytes)</Label>
              <Input
                id="dwp-input-size"
                type="number"
                min={0}
                placeholder="e.g., 86888890"
                value={dwpInputDataSize || ""}
                onChange={(e) => setDwpInputDataSize(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-64"
              />
              {validationErrors.dwpInputDataSize && <p className="text-xs text-red-500">{validationErrors.dwpInputDataSize}</p>}
              <p className="text-xs text-muted-foreground">
                File size in bytes. Used for byte-range calculation. Set to 0 if unknown (auto-detection at runtime).
              </p>
            </div>

            {/* Output Base Path */}
            <div className="grid gap-2">
              <Label htmlFor="dwp-output-path">
                Output Base Path (GCS) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dwp-output-path"
                placeholder="gs://my-bucket/output"
                value={dwpOutputPath}
                onChange={(e) => setDwpOutputPath(e.target.value)}
                className="font-mono text-sm"
              />
              {validationErrors.dwpOutputPath && <p className="text-xs text-red-500">{validationErrors.dwpOutputPath}</p>}
              <p className="text-xs text-muted-foreground">
                Each instance writes to <code className="bg-gray-100 px-1 rounded text-[10px]">{"{output_base_path}"}/instance-{"{INDEX}"}.json</code>
              </p>
            </div>

            {/* Architecture Diagram */}
            <DWPArchitectureDiagram
              taskCount={dwpTaskCount}
              inputPath={dwpInputPath}
              outputPath={dwpOutputPath}
              inputDataSize={dwpInputDataSize}
              distributionMode={dwpDistributionMode}
            />
          </div>
        )}
      </Section>

      {/* ── 3. Configuration (Priority 1 — expanded) ── */}
      <Section title="Configuration" subtitle="Timeout, retries, and environment variables." defaultOpen={true}>

        {/* Timeout */}
        <div>
          <Label className="mb-2 block">Max Duration (Timeout)</Label>
          <div className="flex gap-3">
            {[
              { label: "Hours", value: hours, setter: setHours, max: 4, errorKey: "hours" },
              { label: "Minutes", value: minutes, setter: setMinutes, max: 59, errorKey: "minutes" },
              { label: "Seconds", value: seconds, setter: setSeconds, max: 59, errorKey: "seconds" },
            ].map(({ label, value, setter, max, errorKey }) => (
              <div key={label} className="flex-1 grid gap-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  max={max}
                  value={value}
                  onChange={(e) => setter(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
                />
                {validationErrors[errorKey] && <p className="text-xs text-red-500">{validationErrors[errorKey]}</p>}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total: {resolveDurationSeconds(hours, minutes, seconds)}s
          </p>
        </div>

        {/* Max Retries */}
        <div className="grid gap-2">
          <Label htmlFor="max-retries">Max Retries</Label>
          <Input
            id="max-retries"
            type="number"
            min={1}
            max={5}
            value={maxRetries}
            onChange={(e) => setMaxRetries(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
            className="w-32"
          />
          {validationErrors.maxRetries && <p className="text-xs text-red-500">{validationErrors.maxRetries}</p>}
          <p className="text-xs text-muted-foreground">Integer between 1 and 5. Default: 3.</p>
        </div>

        {/* Environment Variables */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Environment Variables</Label>
            <Button type="button" variant="outline" size="sm" onClick={addEnvVar}>+ Add Variable</Button>
          </div>
          {envVars.length === 0 && (
            <p className="text-xs text-muted-foreground py-3 text-center border rounded-lg">No environment variables yet.</p>
          )}
          <div className="space-y-2">
            {envVars.map((ev, i) => (
              <div key={ev.id} className="flex gap-2 items-start">
                <div className="flex-1 grid gap-1">
                  <Input
                    placeholder="KEY_NAME"
                    value={ev.key}
                    onChange={(e) => updateEnvVar(ev.id, "key", e.target.value)}
                    className="font-mono text-sm"
                  />
                  {validationErrors[`envKey_${i}`] && (
                    <p className="text-xs text-red-500">{validationErrors[`envKey_${i}`]}</p>
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="value"
                    type={ev.sensitive ? "password" : "text"}
                    value={ev.value}
                    onChange={(e) => updateEnvVar(ev.id, "value", e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    type="button"
                    title={ev.sensitive ? "Mark as plain" : "Mark as sensitive"}
                    onClick={() => updateEnvVar(ev.id, "sensitive", !ev.sensitive)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${ev.sensitive ? "bg-yellow-100 border-yellow-400 text-yellow-800" : "border-gray-200 text-gray-400 hover:text-gray-600"}`}
                  >
                    {ev.sensitive ? "🔒" : "👁"}
                  </button>
                  <button type="button" onClick={() => removeEnvVar(ev.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── 4. Advanced Resources (Priority 2 — collapsed) ── */}
      <Section title="Advanced Resources" subtitle="Boot disk and spot VM settings." defaultOpen={false}>

        {/* Boot Disk Size */}
        <div className="grid gap-2">
          <Label htmlFor="boot-disk">Boot Disk Size (GB)</Label>
          <Input
            id="boot-disk"
            type="number"
            min={10}
            max={100}
            value={bootDiskSize}
            onChange={(e) => setBootDiskSize(Math.max(10, Math.min(100, parseInt(e.target.value) || 10)))}
            className="w-32"
          />
          {validationErrors.bootDisk && <p className="text-xs text-red-500">{validationErrors.bootDisk}</p>}
          {bootDiskSize < 20 && (
            <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-xs">
              <WarningAmberIcon fontSize="small" />
              <span>Values below 20 GB may cause jobs to fail due to insufficient space.</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Integer between 10 and 100. Default: 50 GB.</p>
        </div>

        {/* Spot VMs */}
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={spotDisabled}
              onClick={() => !spotDisabled && setUseSpotVMs((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${useSpotVMs && !spotDisabled ? "bg-black" : "bg-gray-200"} ${spotDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${useSpotVMs && !spotDisabled ? "translate-x-4" : ""}`} />
            </button>
            <div>
              <Label className={spotDisabled ? "text-gray-400" : ""}>Use Spot VMs</Label>
              {spotDisabled && <p className="text-xs text-muted-foreground">Unavailable when using a GPU machine type.</p>}
            </div>
          </div>
          {useSpotVMs && !spotDisabled && (
            <div className="mt-3 flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-xs">
              <WarningAmberIcon fontSize="small" />
              <span>Your job can be interrupted. Only use for fault-tolerant workloads.</span>
            </div>
          )}
        </div>
      </Section>

      {/* ── 5. Advanced Security & Logging (Priority 3 — collapsed) ── */}
      <Section title="Advanced Security & Logging" subtitle="Service account and log streaming." defaultOpen={false}>

        {/* Service Account */}
        <div className="grid gap-2">
          <Label htmlFor="service-account">Service Account <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            id="service-account"
            placeholder="my-sa@my-project.iam.gserviceaccount.com"
            value={serviceAccount}
            onChange={(e) => setServiceAccount(e.target.value)}
          />
          {validationErrors.serviceAccount && <p className="text-xs text-red-500">{validationErrors.serviceAccount}</p>}
          <p className="text-xs text-muted-foreground">Leave blank to use the default service account.</p>
        </div>

        {/* Stream Logs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStreamLogs((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${streamLogs ? "bg-black" : "bg-gray-200"} cursor-pointer`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${streamLogs ? "translate-x-4" : ""}`} />
          </button>
          <div>
            <Label>Stream Logs</Label>
            <p className="text-xs text-muted-foreground">Stream job output to Cloud Logging in real time. Default: on.</p>
          </div>
        </div>
      </Section>

      {/* ── Submit ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Submission failed</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      {successInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold text-green-700">Job submitted successfully</p>
          <div className="space-y-1.5 text-xs text-green-800">
            <div className="flex gap-2">
              <span className="font-medium w-28 shrink-0">Job ID</span>
              <span className="font-mono break-all">{successInfo.jobId}</span>
            </div>
            {successInfo.workerAssigned && (
              <div className="flex gap-2">
                <span className="font-medium w-28 shrink-0">Worker</span>
                <span className="font-mono">{successInfo.workerAssigned}</span>
              </div>
            )}
            {successInfo.complexityLevel && (
              <div className="flex gap-2">
                <span className="font-medium w-28 shrink-0">Complexity</span>
                <span className="font-mono">{successInfo.complexityLevel}</span>
              </div>
            )}
            {successInfo.assignedService && (
              <div className="flex gap-2">
                <span className="font-medium w-28 shrink-0">Routed to</span>
                <span className="font-mono">{successInfo.assignedService}</span>
              </div>
            )}
            {successInfo.routingReason && (
              <div className="flex gap-2">
                <span className="font-medium w-28 shrink-0">Reason</span>
                <span>{successInfo.routingReason}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-green-600">Redirecting to jobs list...</p>
        </div>
      )}
      <div className="flex w-auto pt-2 pb-8">
        <Button
          onClick={handleSubmit}
          disabled={!jobName.trim() || !containerImage.trim() || loading || !!successInfo}
          size="lg"
          className="px-8"
        >
          {loading ? "Submitting..." : "Create Workload & Run"}
        </Button>
      </div>
    </div>
  );
}
