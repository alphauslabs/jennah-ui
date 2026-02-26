import { useState } from 'react';
import { client } from '../client';
import { create } from '@bufbuild/protobuf';
import { GetJobRequestSchema } from '../../gen/proto/jennah_pb';
import type { Job, GetJobResponse } from '../../gen/proto/jennah_pb';

export function useGetJob() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  const fetchJob = async (jobId: string) => {
    setLoading(true);
    setError(null);

    try {
      const request = create(GetJobRequestSchema, { jobId });
      const response = await (client.getJob as (request: typeof request) => Promise<GetJobResponse>)(request);
      setJob(response.job ?? null);
      return response.job;
    } catch (err: any) {
      setError("Unable to fetch job details. Please check your connection.");
      console.error("GetJob Error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchJob, job, loading, error };
}
