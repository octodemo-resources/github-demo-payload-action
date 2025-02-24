import { OctokitResponse } from '@octokit/types';
import { GitHubLabel } from '../../src/types.js';

const DefaultLabel: GitHubLabel = {
  "id": 208045946,
  "node_id": "MDU6TGFiZWwyMDgwNDU5NDY=",
  "url": "https://api.github.com/repositories/42/labels/bug",
  "name": "bug",
  "description": "Something isn't working",
  "color": "d73a4a",
  "default": false
};

/**
 * Creates a mock GitHub label with default values that can be overridden
 */
export function createMockLabel(overrides?: Partial<GitHubLabel>): GitHubLabel {
  return Object.assign({}, DefaultLabel, overrides);
}

export function createMockResponse<T>(data: T): OctokitResponse<T, 200> {
  return {
    data,
    headers: {},
    status: 200,
    url: 'https://api.github.com/mock'
  };
}