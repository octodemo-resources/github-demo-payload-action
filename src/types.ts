import { Repository as VineRepository } from './demo-payload/TypeValidations.js';
export type Repository = VineRepository;

export type DeploymentState = 'error' | 'failure' | 'inactive' | 'in_progress' | 'queued' | 'pending' | 'success'

export type DeploymentStatus = {
  id: number,
  state: DeploymentState,
  description?: string,
  environment?: string,
  log_url?: string,
  created_at: string,
  updated_at: string,
}

export interface GitHubLabel {
  id?: number;
  node_id?: string;
  url?: string;
  name?: string;
  description?: string | null;
  color?: string | null;
  default?: boolean;
}

//TODO delete this file entirely