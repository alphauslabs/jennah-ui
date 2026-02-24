import { useState } from 'react';
import { client } from '../client';
import type { Job, ListJobsRequest, ListJobsResponse } from '../../gen/proto/jennah_pb';

export function useListJobs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      // ListJobsRequest is now empty — tenant is resolved server-side via auth headers
      const request = {} as ListJobsRequest;

      // Cast to select the unary overload
      const response = await (client.listJobs as (request: ListJobsRequest) => Promise<ListJobsResponse>)(request);

      console.log("useListJobs - Raw API response:", response);
      console.log("useListJobs - Jobs array:", response.jobs);
      if (response.jobs && response.jobs.length > 0) {
        console.log("useListJobs - First job:", response.jobs[0]);
        console.log("useListJobs - First job keys:", Object.keys(response.jobs[0]));
      }

      setJobs(response.jobs || []);
      return response;
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      const detailedError = `Unable to fetch job list: ${errorMessage}. Backend API may not be running.`;
      setError(detailedError);
      console.error("ListJobs Error Details:", {
        message: err?.message,
        code: err?.code,
        fullError: err,
        apiUrl: import.meta.env.VITE_API_GATEWAY_URL || "/api"
      });
    } finally {
      setLoading(false);
    }
  };

  return { fetchJobs, jobs, loading, error };
}