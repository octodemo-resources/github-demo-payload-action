import { Octokit } from '@octokit/rest';
import { Repository as VineRepository } from './demo-payload/TypeValidations.js';

// GitHub Repository type
export type Repository = VineRepository;

// GitHub Deployment types
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

// Octokit utility types
type OctokitType = InstanceType<typeof Octokit>;

type IssuesListForRepoParameters = NonNullable<Parameters<OctokitType['rest']['issues']['listForRepo']>[0]>;
export type IssueState = NonNullable<IssuesListForRepoParameters['state']>;

type IssueResponse = Awaited<ReturnType<OctokitType['rest']['issues']['get']>>['data'];
export type GitHubLabel = NonNullable<IssueResponse['labels']>[number];