import { useState } from 'react';
import { client } from '../client';
import { create } from '@bufbuild/protobuf';
import { ListNotificationsRequestSchema } from '../../gen/proto/jennah_pb';
import type { ListNotificationsRequest, ListNotificationsResponse } from '../../gen/proto/jennah_pb';

export function useListNotifications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async (limit = 20, sinceTimestamp?: bigint) => {
    setLoading(true);
    setError(null);
    try {
      const request = create(ListNotificationsRequestSchema, {
        limit,
        ...(sinceTimestamp !== undefined && { sinceTimestamp }),
      });
      const response = await (client.listNotifications as (req: ListNotificationsRequest) => Promise<ListNotificationsResponse>)(request);
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications.');
      console.error('ListNotifications error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { fetchNotifications, loading, error };
}
