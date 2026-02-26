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
  gcpBatchJobName?: string;
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
  gcpBatchJobName,
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
  onBack,
}: ViewJobFormProps) {
  const finalJobID = jobID;
  const finalContainerLink = containerLink;
  const finalDuration = duration;
  const finalEnvVars = envVars;
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
          {gcpBatchJobName && (
            <>
              <div className="h-px bg-border" />
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">GCP Batch Job Name</span>
                <p className="text-base font-medium font-mono break-all">{gcpBatchJobName}</p>
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
                {(finalEnvVars || []).map((envVar) => {
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
