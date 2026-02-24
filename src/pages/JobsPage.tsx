import { useState, useEffect, useMemo } from "react";

// COMPONENTS
import { JobsCard } from "@/components/JobsCard";
import { SearchBar } from "@/components/SearchBar";
import { NavigationBar } from "../components/NavigationBar";
// import { Button } from "@/components/ui/button";
// import {
//   InputGroup,
//   InputGroupAddon,
//   InputGroupInput,
// } from "@/components/ui/input-group";

import { ExecutionHistory } from "@/components/ExecutionHistory";
// import { AccountSection } from "@/components/AccountSection";
import { useListJobs } from "@/api/hooks/useListJobs";
import { useGetCurrentTenant } from "@/api/hooks/useGetCurrentTenant";
import { SortByDropdown, type SortOption } from "@/components/SortByDropdown";
import type { Job as BackendJob } from "@/gen/proto/jennah_pb";
import type { FilterOptions } from "@/components/FilterPopover";


// INTERFACES
interface JobWithMetadata {
  $typeName: string;
  jobId: string;
  id: string;
  tenantId: string;
  imageUri: string;
  workloadName: string;
  projectName: string;
  status: string;
  createdAt: string;
}

interface ExecutionHistoryItem {
  id: string;
  status:
    | "Running"
    | "Completed"
    | "Failed"
    | "Pending"
    | "Scheduled"
    | "Cancelled";
  jobName: string;
  jobId: string;
  runId: string;
  user: string;
  duration: string;
}

export default function Jobs() {
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    statuses: [],
    projectNames: [],
  });
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const { fetchJobs, jobs: backendJobs, loading, error } = useListJobs();
  const { getCurrentTenant, tenant } = useGetCurrentTenant();

  // Map backend jobs to UI format
  const jobs: JobWithMetadata[] = (backendJobs || []).map((job: any) => ({
    $typeName: "JobCardJob",
    jobId: job.jobId,
    id: job.jobId,
    tenantId: job.tenantId || "",
    imageUri: job.imageUri || "",
    workloadName: job.imageUri || job.jobId, // use imageUri as name
    projectName: job.tenantId || "",
    status: job.status || "PENDING",
    createdAt: job.createdAt || "",
  }));

  // Helper function to normalize status for ExecutionHistory
  const normalizeStatus = (
    status: string
  ): ExecutionHistoryItem["status"] => {
    const statusMap: Record<
      string,
      ExecutionHistoryItem["status"]
    > = {
      RUNNING: "Running",
      COMPLETED: "Completed",
      PENDING: "Pending",
      SCHEDULED: "Scheduled",
      FAILED: "Failed",
      CANCELLED: "Cancelled",
    };
    return statusMap[status] || "Pending";
  };

  // Helper function to format relative time
  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Generate ExecutionHistory from jobs, sorted chronologically (latest first)
  const executionHistory = useMemo(() => {
    return (backendJobs || [])
      .map((job: BackendJob) => ({
        id: job.jobId,
        status: normalizeStatus(job.status),
        jobName: job.imageUri || job.jobId,
        jobId: job.jobId,
        runId: job.jobId.substring(0, 8),
        user: tenant?.userEmail || "Unknown",
        duration: formatRelativeTime(job.createdAt || new Date().toISOString()),
      }))
      .sort((a, b) => {
        // Sort by createdAt in descending order (latest first)
        const jobA = backendJobs.find((j: BackendJob) => j.jobId === a.jobId);
        const jobB = backendJobs.find((j: BackendJob) => j.jobId === b.jobId);
        if (!jobA || !jobB) return 0;
        return (
          new Date(jobB.createdAt || 0).getTime() -
          new Date(jobA.createdAt || 0).getTime()
        );
      });
  }, [backendJobs, tenant]);

  // Extract unique projects from jobs
  const availableProjects = useMemo(() => {
    const projects = new Set(jobs.map((job) => job.projectName).filter(Boolean));
    return Array.from(projects).sort();
  }, [jobs]);

  // Apply filters and sorting
  const filteredJobs = useMemo(() => {
    let filtered = jobs.filter((job) => {
      // If no filters are active, show all jobs
      if (
        activeFilters.statuses.length === 0 &&
        activeFilters.projectNames.length === 0
      ) {
        return true;
      }

      // Check status filter
      if (
        activeFilters.statuses.length > 0 &&
        !activeFilters.statuses.includes(job.status)
      ) {
        return false;
      }

      // Check project filter
      if (
        activeFilters.projectNames.length > 0 &&
        !activeFilters.projectNames.includes(job.projectName)
      ) {
        return false;
      }

      return true;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        case "name-asc":
          return a.workloadName.localeCompare(b.workloadName);
        case "name-desc":
          return b.workloadName.localeCompare(a.workloadName);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return sorted;
  }, [jobs, activeFilters, sortBy]);

  const handleFilterChange = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };

  useEffect(() => {
    fetchJobs();
    getCurrentTenant();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavigationBar />
      <main className="px-8 md:px-40 py-20 grow">
        <div className="mb-20">
          <h1 className="text-5xl md:text-6xl font-semibold text-black mb-4 leading-tight">
            Jobs
          </h1>
          <p className="text-xl text-gray-600 font-light">
            Monitor and manage your workflows
          </p>
        </div>
        <SearchBar
          onFilterChange={handleFilterChange}
          availableProjects={availableProjects}
          activeFilterCount={
            activeFilters.statuses.length + activeFilters.projectNames.length
          }
        />

        {/* Sort Control */}
        <div className="mb-8">
          <SortByDropdown value={sortBy} onSortChange={setSortBy} />
        </div>

        {loading && (
          <div className="text-center py-10">
            <p className="text-gray-500">Loading jobs...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 md:grid-cols-1 gap-8 mb-20">
          {!loading && filteredJobs.length === 0 && !error && (
            <div className="col-span-2 text-center py-10">
              <p className="text-gray-500">
                {jobs.length === 0
                  ? "No jobs found. Submit your first job to get started!"
                  : "No jobs match the selected filters."}
              </p>
            </div>
          )}
          {filteredJobs.map((job) => (
            <JobsCard
              key={job.jobId}
              job={job as any}
              onCancelled={() => fetchJobs()}
              onDeleted={() => fetchJobs()}
            />
          ))}
        </div>
        <div className="mb-20">
          <ExecutionHistory history={executionHistory} />
        </div>
        {/* <AccountSection /> */}
      </main>
    </div>
  );
}
