import { useState } from 'react';
import { client } from '../client';
import type { SubmitJobRequest, SubmitJobResponse } from "../../gen/proto/jennah_pb";

export function useSubmitJob() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SubmitJobResponse | null>(null);

  const submitJob = async (jobData: SubmitJobRequest) => {
    setLoading(true);
    setError(null);

    try {
      // Cast to select the unary overload explicitly
      const res = await (client.submitJob as (request: SubmitJobRequest) => Promise<SubmitJobResponse>)(jobData);
      setResponse(res);
      return res;
    } catch (err: any) {
      setError(err.message || "Failed to submit job");
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submitJob, response, loading, error };
}