import { createClient} from "@connectrpc/connect";
import { transport } from "./transport";
import { DeploymentService } from "../gen/proto/jennah_pb"; 

// Mock client for development - will be replaced when backend is ready
export const client = {
  submitJob: async (data: any) => {
    console.warn('Backend not connected - submitJob called with:', data);
    return { success: false, message: 'Backend not available' };
  },
  listJobs: async (data: any) => {
    console.warn('Backend not connected - listJobs called');
    return { jobs: [] };
  }
} as any;
