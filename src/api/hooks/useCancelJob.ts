import { useState } from 'react';
import { client } from '../client';
import { create } from '@bufbuild/protobuf';
import { CancelJobRequestSchema } from '../../gen/proto/jennah_pb';
import type { CancelJobResponse } from '../../gen/proto/jennah_pb';

export function useCancelJob() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CancelJobResponse | null>(null);

  const cancelJob = async (jobId: string) => {
    setLoading(true);
    setError(null);

    try {
      const request = create(CancelJobRequestSchema, { jobId });
      const res = await (client.cancelJob as (request: typeof request) => Promise<CancelJobResponse>)(request);
      setResponse(res);
      return res;
    } catch (err: any) {
      const msg = err?.message || "Failed to cancel job. Job may not be in a cancellable state.";
      setError(msg);
      console.error("CancelJob Error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { cancelJob, response, loading, error };
}
