import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import { DemoDeployment, GitHubDeploymentData, GitHubDeploymentValidator } from './DemoDeployment.js';
import { DEMO_DEPLOYMENT_TASK, DEMO_STATES } from './constants.js';
import { DemoPayload } from './demo-payload/DemoPayload.js';
import { DeploymentState, DeploymentStatus, GitHubLabel, IssueState, Repository } from './types.js';

export class GitHubDeploymentManager {

  private readonly github: Octokit;

  private readonly repo: Repository;

  private readonly ref: string;

  private issueLabelCache: Map<number, string[]>;

  private isLabelCacheInitialized: boolean;

  constructor(repo: Repository, github: Octokit, ref?: string) {
    this.repo = repo;
    this.github = github;
    this.ref = ref || 'main';
    this.issueLabelCache = new Map();
    this.isLabelCacheInitialized = false;
  }

  getDemoDeploymentForUUID(uuid: string): Promise<DemoDeployment | undefined> {
    return this.getAllDemoDeployments()
      .then(deployments => {
        let matched = deployments?.filter((deployment) => deployment.uuid === uuid)
        if (matched && matched.length > 0) {
          return matched[0];
        }
      });
  }

  getDeploymentStatus(id: number): Promise<DeploymentStatus | undefined> {
    core.info(`Fetching deployment status for ${id}`);
    return this.github.paginate('GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses', {
      ...this.repo,
      deployment_id: id,
      per_page: 100,
    }).then(statuses => {
      if (statuses && statuses.length > 0) {
        //@ts-ignore
        return createDeploymentStatus(statuses[0]);
      }
      return undefined;
    });
  }

  deactivateDeployment(id: number): Promise<boolean> {
    core.info(`Deactivating deployment ${id}`);
    return this.github.rest.repos.createDeploymentStatus({
      ...this.repo,
      deployment_id: id,
      state: 'inactive',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      return resp.status === 201;
    });
  }

  deleteDeployment(id: number): Promise<boolean> {
    core.info(`Deleting deployment ${id}`);
    return this.github.rest.repos.deleteDeployment({
      ...this.repo,
      deployment_id: id,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      return resp.status === 204;
    });
  }

  deactivateAndDeleteDeployment(id: number): Promise<boolean> {
    const self = this;
    return self.deactivateDeployment(id)
      .then(() => {
        return self.deleteDeployment(id);
      });
  }

  getEnvironmentDeployments(name: string): Promise<DemoDeployment[] | undefined> {
    core.info(`Listing deployments for ${this.repo.owner}/${this.repo.repo} with environment ${name}`);
    return this.github.rest.repos.listDeployments({
      ...this.repo,
      environment: name,
      task: 'deploy',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      if (resp.status === 200 && resp.data) {
        //@ts-ignore
        return Promise.all(resp.data.map((data) => generateDemoDeployment(data, this)));
      }
      return undefined;
    });
  }

  getEnvironmentDeploymentId(name: string): Promise<number | undefined> {
    return this.getEnvironmentDeployments(name)
      .then(results => {
        if (results && results.length > 0) {
          return results[0].id;
        }
        return undefined;
      });
  }

  getAllDemoDeployments(): Promise<DemoDeployment[] | undefined> {
    core.info(`Fetching all deployments for ${this.repo.owner}/${this.repo.repo}`);
    return this.github.paginate('GET /repos/{owner}/{repo}/deployments', {
        ...this.repo,
        task: DEMO_DEPLOYMENT_TASK,
        per_page: 100
      }).then(deployments => {
        core.info(`Found ${deployments.length} deployments. Extracting deployments from response...`);
        return this.extractDemoDeploymentsFromResponse(deployments)
      });
  }

  getDemoDeployments(name: string): Promise<DemoDeployment[] | undefined> {
    core.info(`Fetching deployments for ${this.repo.owner}/${this.repo.repo} with environment ${name}`);
    return this.github.paginate('GET /repos/{owner}/{repo}/deployments', {
        ...this.repo,
        environment: `demo/${name}`,
        task: DEMO_DEPLOYMENT_TASK,
        per_page: 100
      }).then(deployments => {
        return this.extractDemoDeploymentsFromResponse(deployments)
      });
  }

  getDemoDeployment(name: string): Promise<DemoDeployment | undefined> {
    return this.getDemoDeployments(name)
      .then(results => {
        if (results && results.length > 0) {
          return results[0];
        }
        return undefined;
      });
  }

  getDemoDeploymentById(id: number): Promise<DemoDeployment> {
    core.info(`Fetching deployment for ${this.repo.owner}/${this.repo.repo} with id ${id}`);
    return this.github.rest.repos.getDeployment({
      ...this.repo,
      deployment_id: id,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      if (resp.data.task !== DEMO_DEPLOYMENT_TASK) {
        throw new Error(`The deployment for id ${id} is not a valid demo deployment type`);
      }
      return generateDemoDeployment(resp.data, this);
    });
  }

  // createDemoDeployment(name: string, uuid: string, payload: { [key: string]: any }): Promise<DemoDeployment> {
  createDemoDeployment(demo: DemoPayload): Promise<DemoDeployment> {
    core.info(`Creating deployment for ${this.repo.owner}/${this.repo.repo} with payload uuid ${demo.uuid}`);
    return this.github.rest.repos.createDeployment({
      ...this.repo,
      ref: this.ref,
      task: DEMO_DEPLOYMENT_TASK,
      auto_merge: false,
      required_contexts: [],
      environment: `demo/${demo.repository.owner}/${demo.repository.repo}`,
      payload: demo.asJsonString,
      description: `${demo.uuid}`,
      transient_environment: true,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      },
    }).then(result => {
      if (result.status === 201) {
        return generateDemoDeployment(result.data, this);
      } else {
        throw new Error(`Invalid status response ${result.status} when creating deployment`);
      }
    });
  }

  setDemoDeploymentStateProvisioning(id: number): Promise<DeploymentStatus> {
    return this.updateDeploymentStatus(id, 'in_progress', DEMO_STATES.provisioning);
  }

  setDemoDeploymentStateProvisioned(id: number): Promise<DeploymentStatus> {
    return this.updateDeploymentStatus(id, 'success', DEMO_STATES.provisioned);
  }

  setDemoDeploymentStateErrored(id: number) {
    return this.updateDeploymentStatus(id, 'error', DEMO_STATES.error);
  }

  updateDeploymentStatus(id: number, state: DeploymentState, description?: string, logUrl?: string): Promise<DeploymentStatus> {
    const payload = {
      ...this.repo,
      deployment_id: id,
      state: state,
      auto_inactive: true,
      description: description ?? '',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      },
    };

    if (logUrl) {
      payload['log_url'] = logUrl;
    }

    core.info(`Updating deployment status for ${id} to ${state}`);
    return this.github.rest.repos.createDeploymentStatus(payload)
      .then(resp => {
        if (resp.status !== 201) {
          throw new Error(`Failed to create deployment status, unexpected status code; ${resp.status}`);
        }
        return createDeploymentStatus(resp.data);
      });
  }

  async getIssueLabels(issueId: number, useCache: boolean = true): Promise<string[]> {
    if (!useCache) {
      return this.fetchLabelsForIssue(issueId);
    }

    if (!this.isLabelCacheInitialized) {
      await this.initializeLabelCache();
    }

    const cachedLabels: string[] | undefined = this.issueLabelCache?.get(issueId);
    if (cachedLabels !== undefined) {
      core.debug(`Cache hit for issue ${issueId}`);
      return cachedLabels;
    }

    core.debug(`Cache miss for issue ${issueId}`);
    return this.fetchLabelsForIssue(issueId);
  }

  addIssueLabels(issueId: number, ...label: string[]): Promise<boolean> {
    core.info(`Adding labels [${label.join(',')}] to issue ${issueId}`);
    return this.github.rest.issues.addLabels({
      ...this.repo,
      issue_number: issueId,
      labels: label,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      if (resp.status === 200) {
        return true;
      } else if (resp.status === 410) {
        return false;
      } else {
        throw new Error(`Unexpected status code ${resp.status} when adding labels to issue ${issueId}`);
      }
    });
  }

  removeIssueLabels(issueId: number, ...label: string[]): Promise<boolean> {
    const promises: Promise<boolean>[] = [];

    core.info(`Removing labels [${label.join(',')}] from issue ${issueId}`);
    label.forEach(label => {
      const promise = this.github.rest.issues.removeLabel({
        ...this.repo,
        issue_number: issueId,
        name: label,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
        .catch(err => {
          // Ignore errors that prove the label is not there
          if (err.status !== 404 && err.status !== 410) {
            throw err;
          }
        }).then(() => {
          return true;
        });

      promises.push(promise);
    })

    return Promise.all(promises).then(results => {
      return true;
    });
  }

  addIssueComment(id: number, comment: string): Promise<boolean> {
    core.info(`Adding comment to issue ${id}`);
    return this.github.rest.issues.createComment({
      ...this.repo,
      issue_number: id,
      body: comment,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      return resp.status === 201;
    });
  }

  async fetchLabelsForIssue(issueId: number): Promise<string[]> {
    core.info(`Fetching labels for issue ${issueId}`);
    return this.github.rest.issues.listLabelsOnIssue({
      ...this.repo,
      issue_number: issueId,
      per_page: 100,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }).then(resp => {
      return resp.data.map(label => label.name);
    }).catch(() => {
      return [];
    })
  }

  async fetchLabelsForRepo(
    state: IssueState = 'open',
    repo: Repository = this.repo
  ): Promise<Map<number, string[]>> {
    const labelMap = new Map<number, string[]>();

    try {
      const issues = await this.github.paginate(this.github.rest.issues.listForRepo, {
        ...repo,
        state,
        per_page: 100,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      issues.forEach(issue => {
        if (issue.labels) {
          labelMap.set(
            issue.number,
            Array.isArray(issue.labels)
              ? issue.labels
                  .map((label: GitHubLabel) => {
                    if (typeof label === 'string') return label;
                    return label?.name;
                  })
                  .filter((name): name is string => Boolean(name))
              : []
          );
        }
      });

      core.info(`Fetched labels for ${labelMap.size} ${state} issues`);
      return labelMap;
    } catch (error) {
      core.warning(`Failed to fetch issue labels: ${error}`);
      return new Map<number, string[]>();
    }
  }

  private async initializeLabelCache(
    state: IssueState = 'open',
    repo: Repository = this.repo
  ): Promise<void> {
    try {
      this.issueLabelCache = await this.fetchLabelsForRepo(state, repo);

      core.debug('Label cache contents:');
      core.debug(JSON.stringify(Object.fromEntries(this.issueLabelCache), null, 2));

      this.isLabelCacheInitialized = true;
      core.info(`Initialized label cache with ${this.issueLabelCache.size} ${state} issues`);
    } catch (error) {
      core.warning(`Failed to initialize label cache: ${error}`);
      this.issueLabelCache = new Map();
      this.isLabelCacheInitialized = false;
    }
  }

  private async extractDemoDeploymentsFromResponse(resp: any[]): Promise<DemoDeployment[] | undefined> {
    const manager = this;

    if (resp && resp.length > 0) {
      const results = await Promise.all(resp.map((data) => {return generateDemoDeployment(data, manager)}));
      return results;
    }
    return undefined;
  }
}

async function generateDemoDeployment(deployment: GitHubDeploymentData, manager: GitHubDeploymentManager): Promise<DemoDeployment> {
  //TODO could use Vine definition here to validate the payload
  try {
    const payload = await GitHubDeploymentValidator.validate(deployment);
    return new DemoDeployment(payload, manager);
  } catch (err: any) {
    //TODO need to extract the parsing error from VineJS
    throw err;
  };
}

function createDeploymentStatus(status: { [key: string]: any }): DeploymentStatus {
  return {
    id: status.id,
    state: status.state,
    description: status.description || '',
    environment: status.environment || '',
    created_at: status.created_at,
    updated_at: status.updated_at,
    log_url: status.log_url,
  }
}
