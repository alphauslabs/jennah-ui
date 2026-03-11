import { useState } from 'react';
import { client } from '../client';
import { create } from '@bufbuild/protobuf';
import { AckNotificationRequestSchema } from '../../gen/proto/jennah_pb';
import type { AckNotificationRequest, AckNotificationResponse } from '../../gen/proto/jennah_pb';

export function useAckNotification() {
  const [loading, setLoading] = useState(false);

  const ackNotification = async (notificationId: string) => {
    setLoading(true);
    try {
      const request = create(AckNotificationRequestSchema, { notificationId });
      const response = await (client.ackNotification as (req: AckNotificationRequest) => Promise<AckNotificationResponse>)(request);
      return response;
    } catch (err: any) {
      console.error('AckNotification error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { ackNotification, loading };
}
