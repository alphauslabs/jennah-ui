import { NavigationBar } from "@/components/NavigationBar";
// import { AccountSection } from "@/components/AccountSection";
import { ViewJobForm } from "@/components/ViewJobForm";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useListJobs } from "@/api/hooks/useListJobs";
import type { Job as BackendJob } from "@/gen/proto/jennah_pb";

interface EnvVar {
  id: string;
  key: string;
  value: string;
  error?: string;
}

interface Job {
  jobId: string;
  workloadName: string;
  containerLink: string;
  projectName: string;
  resources: { name: string; vcpu: number; ram: string };
  duration: number;
  envVars: EnvVar[];
  status: "RUNNING" | "COMPLETED" | "PENDING" | "SCHEDULED" | "FAILED" | "CANCELLED";
}

export default function ViewJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | undefined>(undefined);
  const navigate = useNavigate();
  const { fetchJobs, jobs: backendJobs, loading, error } = useListJobs();

  // Map backend job to UI format
  const mappedJob = useMemo(() => {
    if (!backendJobs.length || !jobId) return undefined;
    const backendJob = backendJobs.find((j: BackendJob) => j.jobId === jobId);
    if (!backendJob) return undefined;

    // Valid status values
    const validStatuses = [
      "RUNNING",
      "COMPLETED",
      "PENDING",
      "SCHEDULED",
      "FAILED",
      "CANCELLED",
    ] as const;
    const status = (
      validStatuses.includes(
        backendJob.status as (typeof validStatuses)[number]
      )
        ? backendJob.status
        : "PENDING"
    ) as typeof validStatuses[number];

    return {
      jobId: backendJob.jobId,
      workloadName: backendJob.imageUri || backendJob.jobId,
      containerLink: backendJob.imageUri || "",
      projectName: backendJob.tenantId || "",
      resources: { name: "default", vcpu: 1, ram: "4GB" },
      duration: 3600,
      envVars: [],
      status,
    };
  }, [backendJobs, jobId]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    console.log("ViewJobsPage: Fetching job with ID:", jobId);
    setJob(mappedJob);
  }, [mappedJob]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <NavigationBar />
        <main className="px-8 md:px-40 py-20 grow">
          <h1 className="text-3xl font-semibold text-black">Loading job...</h1>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <NavigationBar />
        <main className="px-8 md:px-40 py-20 grow">
          <h1 className="text-3xl font-semibold text-black">Error loading job</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <NavigationBar />
        <main className="px-8 md:px-40 py-20 grow">
          <h1 className="text-3xl font-semibold text-black">Job not found</h1>
          <Link to="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavigationBar />
      <main className="px-8 md:px-40 py-20 grow">
        <div className="mb-20">
          <h1 className="text-5xl md:text-6xl font-semibold text-black mb-4 leading-tight">
            {job.workloadName}
          </h1>
          <p className="text-xl text-gray-600 font-light">
            View and manage your job configuration
          </p>
        </div>
        <div className="mb-20">
          <ViewJobForm
            jobId={jobId}
            jobName={job.workloadName}
            jobID={job.jobId}
            containerLink={job.containerLink}
            projectDirectory={job.projectName}
            selectedResource={job.resources}
            duration={job.duration}
            envVars={job.envVars}
            status={job.status}
            onBack={handleBack}
          />
        </div>
        {/* <AccountSection /> */}
      </main>
    </div>
  );
}
