import { useState, useEffect, useMemo } from "react";

// COMPONENTS
import { JobsCard } from "@/components/JobsCard";
import { SearchBar } from "@/components/SearchBar";
import { JobsSort } from "@/components/JobsSort";
import { NavigationBar } from "../components/NavigationBar";
import { ExecutionHistory } from "@/components/ExecutionHistory";
// import { AccountSection } from "@/components/AccountSection";
import { useListJobs } from "@/api/hooks/useListJobs";
import { useGetCurrentTenant } from "@/api/hooks/useGetCurrentTenant";
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

export default function Jobs() {
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    statuses: [],
    projectNames: [],
  });
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { fetchJobs, jobs: backendJobs, loading, error } = useListJobs();
  const { getCurrentTenant, tenant } = useGetCurrentTenant();

  useEffect(() => {
    getCurrentTenant();
    fetchJobs();

    // Poll every 10 seconds so statuses stay live without a manual refresh
    const interval = setInterval(() => fetchJobs(), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Filter to only show jobs belonging to the current tenant (client-side safety net)
  const tenantFilteredJobs = tenant
    ? (backendJobs || []).filter((j: any) => j.tenantId === tenant.tenantId)
    : (backendJobs || []);

  // Map backend jobs to UI format
  const jobs: JobWithMetadata[] = tenantFilteredJobs.map((job: any) => ({
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

  // Extract unique projects from jobs
  const availableProjects = useMemo(() => {
    const projects = new Set(jobs.map((job) => job.projectName).filter(Boolean));
    return Array.from(projects).sort();
  }, [jobs]);

  // Apply filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
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
  }, [jobs, activeFilters]);

  // Apply sorting
  const sortedJobs = useMemo(() => {
    const sorted = [...filteredJobs].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "status":
          aVal = a.status?.toLowerCase() || "";
          bVal = b.status?.toLowerCase() || "";
          break;
        case "workloadName":
          aVal = a.workloadName?.toLowerCase() || "";
          bVal = b.workloadName?.toLowerCase() || "";
          break;
        case "projectName":
          aVal = a.projectName?.toLowerCase() || "";
          bVal = b.projectName?.toLowerCase() || "";
          break;
        case "createdAt":
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredJobs, sortField, sortOrder]);

  const handleFilterChange = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };

  const handleSortChange = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

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

        <JobsSort
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onSortOrderToggle={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        />

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
          {sortedJobs.map((job) => (
            <JobsCard
              key={job.jobId}
              job={job as any}
              onCancelled={() => fetchJobs()}
              onDeleted={() => fetchJobs()}
            />
          ))}
        </div>
        <div className="mb-20">
          <ExecutionHistory jobs={tenantFilteredJobs} />
        </div>
        {/* <AccountSection /> */}
      </main>
    </div>
  );
}
