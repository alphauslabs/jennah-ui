import { useState } from 'react';
import { client } from '../client';
import type { Job } from '../../gen/proto/jennah_pb';

export function useListJobs() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

 const fetchJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      //using'any' to bypass strict checks on the placeholder , update when backend is ready
      const response = await client.listJobs({} as any) as any;
      
      setJobs(response.jobs || []); 
      return response;
    } catch (err: any) {
      setError("Unable to fetch job list. Please check your connection.");
      console.error("ListJobs Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return { fetchJobs, jobs, loading, error };
}