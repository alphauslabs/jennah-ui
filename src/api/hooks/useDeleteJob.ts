import { useState } from 'react';
import { client } from '../client';
import { create } from '@bufbuild/protobuf';
import { DeleteJobRequestSchema } from '../../gen/proto/jennah_pb';
import type { DeleteJobResponse } from '../../gen/proto/jennah_pb';

export function useDeleteJob() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<DeleteJobResponse | null>(null);

  const deleteJob = async (jobId: string) => {
    setLoading(true);
    setError(null);

    try {
      const request = create(DeleteJobRequestSchema, { jobId });
      const res = await (client.deleteJob as (request: typeof request) => Promise<DeleteJobResponse>)(request);
      setResponse(res);
      return res;
    } catch (err: any) {
      const msg = err?.message || "Failed to delete job.";
      setError(msg);
      console.error("DeleteJob Error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteJob, response, loading, error };
}
