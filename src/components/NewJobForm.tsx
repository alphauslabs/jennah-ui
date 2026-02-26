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

const PRESET_MAP: Record<string, string> = {
  small:  "e2-micro",
  medium: "e2-standard-4",
  heavy:  "n1-standard-16",
  gpu:    "n1-standard-8+gpu",
};

const PRESETS = [
  { id: "small",  label: "Small",  machine: "e2-micro",        desc: "For simple, short-running tasks" },
  { id: "medium", label: "Medium", machine: "e2-standard-4",   desc: "For most standard workloads" },
  { id: "heavy",  label: "Heavy",  machine: "n1-standard-16",  desc: "For demanding, high-performance jobs" },
  { id: "gpu",    label: "GPU",    machine: "n1-standard-8+gpu", desc: "For machine learning and parallel processing" },
];

const CUSTOM_MACHINES = [
  "e2-micro",
  "e2-standard-2",
  "e2-standard-4",
  "n1-standard-16",
  "n1-standard-8+gpu",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Translates form compute selections into a single machine_type string for the backend. */
function resolveMachineType(method: ComputeMethod, preset: string, custom: string): string {
  if (method === "quick-preset") return PRESET_MAP[preset] ?? "e2-standard-4";
  return custom;
}

/** Combines h/m/s into total seconds for the timeout payload. */
function resolveDurationSeconds(hours: number, minutes: number, seconds: number): number {
  return hours * 3600 + minutes * 60 + seconds;
}

function isGpuMachine(method: ComputeMethod, preset: string, custom: string): boolean {
  return resolveMachineType(method, preset, custom).includes("gpu");
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

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

  // Derived
  const gpuSelected = isGpuMachine(computeMethod, preset, customMachine);
  const spotDisabled = gpuSelected;

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

      const resolvedMachineType = resolveMachineType(computeMethod, preset, customMachine);
      const timeoutSeconds = resolveDurationSeconds(hours, minutes, seconds);

      const res = await submitJob(create(SubmitJobRequestSchema, {
        // jobId intentionally omitted — Gateway generates it
        imageUri: containerImage,
        name: jobName,
        // resourceProfile = named preset; machineType = resolved GCP machine string
        resourceProfile: computeMethod === "quick-preset" ? preset : "",
        machineType: resolvedMachineType,
        envVars: envVarsMap,
        bootDiskSizeGb: BigInt(bootDiskSize),
        useSpotVms: useSpotVMs,
        serviceAccount: serviceAccount,
        commands: [],
        resourceOverride: create(ResourceOverrideSchema, {
          maxRunDurationSeconds: BigInt(timeoutSeconds),
          cpuMillis: BigInt(0),
          memoryMib: BigInt(0),
        }),
      }));

      // Preserve the full UUID returned by the Gateway — never truncate before sending
      const fullJobId = res?.jobId ?? "";
      console.info("Submitted job, full UUID:", fullJobId);

      navigate("/jobs");
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
                <option key={p.id} value={p.id}>{p.label} — {p.machine}</option>
              ))}
            </select>
            {computeMethod === "quick-preset" && (
              <p className="text-xs text-muted-foreground mt-2">
                {PRESETS.find((p) => p.id === preset)?.desc}
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
                Resolved: <code className="font-mono bg-gray-100 px-1 rounded">{customMachine}</code>
              </p>
            )}
          </div>
        </div>

        {/* Resolved machine type preview */}
        <div className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
          Backend will receive: <code className="font-mono text-black">{resolveMachineType(computeMethod, preset, customMachine)}</code>
        </div>
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <div className="flex w-auto pt-2 pb-8">
        <Button
          onClick={handleSubmit}
          disabled={!jobName.trim() || !containerImage.trim() || loading}
          size="lg"
          className="px-8"
        >
          {loading ? "Submitting..." : "Create Workload & Run"}
        </Button>
      </div>
    </div>
  );
}
