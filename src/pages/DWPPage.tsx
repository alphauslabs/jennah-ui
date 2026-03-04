import { NavigationBar } from "@/components/NavigationBar";
import { Button } from "@/components/ui/button";
import { DWPArchitectureDiagram } from "@/components/DWPArchitectureDiagram";
import { useListJobs } from "@/api/hooks/useListJobs";
import { useGetCurrentTenant } from "@/api/hooks/useGetCurrentTenant";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

interface DwpJobInfo {
  jobId: string;
  name: string;
  status: string;
  createdAt: string;
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-800",
    RUNNING: "bg-blue-100 text-blue-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    SCHEDULED: "bg-purple-100 text-purple-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

export default function DWPPage() {
  const { fetchJobs, jobs: backendJobs, loading } = useListJobs();
  const { getCurrentTenant, tenant } = useGetCurrentTenant();

  useEffect(() => {
    getCurrentTenant();
    fetchJobs();
    const interval = setInterval(() => fetchJobs(), 10_000);
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
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

        {/* Architecture Overview */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <DWPArchitectureDiagram
            taskCount={4}
            inputPath="gs://my-bucket/input/data.txt"
            outputPath="gs://my-bucket/output"
            inputDataSize={86888890}
            distributionMode="BYTE_RANGE"
          />
        </div>

        {/* DWP Jobs Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">DWP Jobs</h2>
          {loading && (
            <div className="text-center py-10">
              <p className="text-gray-500">Loading jobs...</p>
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
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Instances</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Mode</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Input Size</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Created</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dwpJobs.map((job) => (
                    <tr key={job.jobId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/jobs/${job.jobId}`} className="font-medium text-blue-600 hover:text-blue-800">
                          {job.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-6 py-4 font-mono">{job.taskCount}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
                          {job.distributionMode}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">{formatBytes(job.inputDataSize)}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/jobs/${job.jobId}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  { key: "INPUT_DATA_SIZE", desc: "File size in bytes for range calculation", example: "86888890" },
                  { key: "OUTPUT_BASE_PATH", desc: "GCS prefix for output files", example: "gs://bucket/output" },
                  { key: "DISTRIBUTION_MODE", desc: "How data is split across instances", example: "BYTE_RANGE" },
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
