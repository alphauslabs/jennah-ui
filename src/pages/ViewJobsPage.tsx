import { NavigationBar } from "@/components/NavigationBar";
import { ViewJobForm } from "@/components/ViewJobForm";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGetJob } from "@/api/hooks/useGetJob";

const statusStyles: Record<string, { className: string; label: string }> = {
  PENDING:   { className: "bg-[#fef7e0] text-[#e37400]", label: "Pending" },
  SCHEDULED: { className: "bg-[#e8f0fe] text-[#1a73e8]", label: "Scheduled" },
  RUNNING:   { className: "bg-[#e8f0fe] text-[#1a73e8]", label: "Running" },
  SUCCEEDED: { className: "bg-[#e6f4ea] text-[#137333]", label: "Succeeded" },
  FAILED:    { className: "bg-[#fce8e6] text-[#c5221f]", label: "Failed" },
  CANCELLED: { className: "bg-[#f1f3f4] text-[#5f6368]", label: "Cancelled" },
};

const ACTIVE_STATUSES = ["PENDING", "SCHEDULED", "RUNNING"];

export default function ViewJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const { fetchJob, job, loading, error } = useGetJob();
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;
    fetchJob(jobId);
  }, [jobId]);

  // Poll every 5s while job is in an active state
  useEffect(() => {
    if (!jobId) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (job && ACTIVE_STATUSES.includes(job.status)) {
      intervalRef.current = setInterval(() => fetchJob(jobId), 5_000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [job?.status, jobId]);

  const handleBack = () => navigate(-1);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
        <NavigationBar />
        <main className="px-6 md:px-12 lg:px-0 py-8 grow max-w-[1100px] mx-auto w-full">
          <p className="text-sm text-[#5f6368]">Loading job...</p>
        </main>
      </div>
    );
  }

  if (error || (!loading && !job)) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
        <NavigationBar />
        <main className="px-6 md:px-12 lg:px-0 py-8 grow max-w-[1100px] mx-auto w-full">
          <h1 className="text-[22px] font-normal text-[#202124] mb-2">Job not found</h1>
          <p className="text-sm text-[#5f6368] mb-6">No job with ID <code className="font-mono bg-[#f1f3f4] px-1.5 py-0.5 rounded text-[#202124]">{jobId}</code> was found.</p>
          <Link to="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <NavigationBar />
      <main className="px-6 md:px-12 lg:px-0 py-8 grow max-w-[1100px] mx-auto w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-6">
          <Link to="/jobs" className="text-[#1a73e8] hover:underline">Jobs</Link>
          <svg className="h-4 w-4 text-[#80868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[#3c4043]">{job!.name || job!.imageUri.split("/").pop()}</span>
        </nav>

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[22px] font-normal text-[#202124]">
            {job!.name || job!.imageUri.split("/").pop()}
          </h1>
          {job!.status && (() => {
            const s = statusStyles[job!.status] || statusStyles.PENDING;
            return (
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${s.className}`}>
                {s.label}
              </span>
            );
          })()}
        </div>
        <p className="text-sm text-[#5f6368] font-mono mb-8">{jobId}</p>

        <div className="mb-12">
          <ViewJobForm
            jobId={jobId}
            jobName={job!.name || job!.imageUri.split("/").pop()}
            jobID={job!.jobId}
            containerLink={job!.imageUri}
            status={job!.status as any}
            createdAt={job!.createdAt}
            updatedAt={job!.updatedAt}
            scheduledAt={job!.scheduledAt}
            startedAt={job!.startedAt}
            completedAt={job!.completedAt}
            errorMessage={job!.errorMessage}
            gcpBatchJobPath={job!.gcpBatchJobPath}
            commands={job!.commands}
            retryCount={job!.retryCount}
            maxRetries={job!.maxRetries}
            machineType={job!.machineType}
            resourceProfile={job!.resourceProfile}
            bootDiskSizeGb={job!.bootDiskSizeGb}
            useSpotVms={job!.useSpotVms}
            serviceAccount={job!.serviceAccount}
            duration={0}
            envVars={(() => {
              try {
                const parsed = JSON.parse(job!.envVarsJson || "{}");
                return Object.entries(parsed).map(([key, value], i) => ({ id: String(i), key, value: String(value) }));
              } catch {
                return [];
              }
            })()}
            onBack={handleBack}
          />
        </div>
        {/* <AccountSection /> */}
      </main>
    </div>
  );
}
