import { Endpoints } from '@octokit/types';
import { createMockDeploymentPayload } from './DemoPayloadMockFactory';

type GitHubDeployment = Endpoints["GET /repos/{owner}/{repo}/deployments"]["response"]["data"][0];

const DefaultDeployment: GitHubDeployment = {
  "url": "https://api.github.com/repos/octocat/example/deployments/1",
  "id": 1,
  "node_id": "MDEwOkRlcGxveW1lbnQx",
  "sha": "a84d88e7554fc1fa21bcbc4efae3c782a70d2b9d",
  "ref": "topic-branch",
  "task": "demo:deployment",
  "payload": createMockDeploymentPayload(),
  "original_environment": "staging",
  "environment": "production",
  "description": "Deploy request from hubot",
  "creator": {
    "login": "octocat",
    "id": 1,
    "node_id": "MDQ6VXNlcjE=",
    "avatar_url": "https://github.com/images/error/octocat_happy.gif",
    "gravatar_id": "",
    "url": "https://api.github.com/users/octocat",
    "html_url": "https://github.com/octocat",
    "followers_url": "https://api.github.com/users/octocat/followers",
    "following_url": "https://api.github.com/users/octocat/following{/other_user}",
    "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/octocat/subscriptions",
    "organizations_url": "https://api.github.com/users/octocat/orgs",
    "repos_url": "https://api.github.com/users/octocat/repos",
    "events_url": "https://api.github.com/users/octocat/events{/privacy}",
    "received_events_url": "https://api.github.com/users/octocat/received_events",
    "type": "User",
    "site_admin": false
  },
  "created_at": "2012-07-20T01:19:13Z",
  "updated_at": "2012-07-20T01:19:13Z",
  "statuses_url": "https://api.github.com/repos/octocat/example/deployments/1/statuses",
  "repository_url": "https://api.github.com/repos/octocat/example",
  "transient_environment": false,
  "production_environment": true
};

export function createMockDeployment(overrides?: Partial<GitHubDeployment>): GitHubDeployment {
  return Object.assign({}, DefaultDeployment, overrides);
}
