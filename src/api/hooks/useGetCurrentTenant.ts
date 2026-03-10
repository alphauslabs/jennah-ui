import { useState } from 'react';
import { client } from '../client';
import { create } from '@bufbuild/protobuf';
import { GetCurrentTenantRequestSchema } from '../../gen/proto/jennah_pb';
import type { GetCurrentTenantRequest, GetCurrentTenantResponse } from '../../gen/proto/jennah_pb';

export function useGetCurrentTenant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<GetCurrentTenantResponse | null>(null);

  const getCurrentTenant = async () => {
    setLoading(true);
    setError(null);

    try {
      // GetCurrentTenantRequest is empty — tenant resolved via auth headers server-side
      const request = create(GetCurrentTenantRequestSchema, {});
      const response = await (client.getCurrentTenant as (request: GetCurrentTenantRequest) => Promise<GetCurrentTenantResponse>)(request);
      setTenant(response);
      return response;
    } catch (err: any) {
      setError(err.message || "Failed to get tenant info.");
      console.error("GetCurrentTenant Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return { getCurrentTenant, tenant, loading, error };
}
