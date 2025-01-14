import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocktokit } from '../test/moctokit/Mocktokit.js';
import { GitHubDeploymentManager } from './GitHubDeploymentManager.js';
import { createMockLabel, createMockResponse } from '../test/moctokit/LabelMockFactory.js';

vi.mock('@actions/core');

describe('GitHubDeploymentManager', () => {
  const repo = { owner: 'octodemo', repo: 'bootstrap' };
  const moctokit = createMocktokit();
  let manager: GitHubDeploymentManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new GitHubDeploymentManager(repo, moctokit);
  });

  describe('fetchLabelsForRepo', () => {
    it('should fetch and map string labels', async () => {
      moctokit.paginate.mockResolvedValueOnce([
        { number: 1, labels: ['bug', 'feature'] }
      ]);

      const result = await manager.fetchLabelsForRepo();
      expect(result.get(1)).toEqual(['bug', 'feature']);
      expect(core.info).toHaveBeenCalledWith('Fetched labels for 1 open issues');
    });

    it('should handle object-based labels', async () => {
      moctokit.paginate.mockResolvedValueOnce([
        {
          number: 2,
          labels: [
            { name: 'bug', id: 1 },
            { name: 'feature', id: 2 }
          ]
        }
      ]);

      const result = await manager.fetchLabelsForRepo();
      expect(result.get(2)).toEqual(['bug', 'feature']);
    });

    it('should handle issues with no labels', async () => {
      moctokit.paginate.mockResolvedValueOnce([
        { number: 1, labels: [] },                   // empty array
        { number: 2, labels: ['', 'valid'] },        // array with empty string
        { number: 3, labels: [null, 'valid'] },      // array with null
        { number: 4, labels: [                       // mixed object labels
          { name: '' },
          { name: 'valid' },
          { name: undefined }
        ] },
      ]);

      const result = await manager.fetchLabelsForRepo();
      expect(result.size).toBe(4);
      expect(result.get(1)).toEqual([]);             // keeps empty array
      expect(result.get(2)).toEqual(['valid']);      // filters empty string
      expect(result.get(3)).toEqual(['valid']);      // filters null
      expect(result.get(4)).toEqual(['valid']);      // filters invalid objects
    });

    it('should handle API errors', async () => {
      moctokit.paginate.mockRejectedValueOnce(new Error('API Error'));

      const result = await manager.fetchLabelsForRepo();
      expect(result.size).toBe(0);
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch issue labels'));
    });

    it('should fetch labels for different issue states', async () => {
      moctokit.paginate.mockResolvedValueOnce([
        { number: 1, labels: ['closed-bug'] }
      ]);

      const result = await manager.fetchLabelsForRepo('closed');
      expect(result.get(1)).toEqual(['closed-bug']);
      expect(core.info).toHaveBeenCalledWith('Fetched labels for 1 closed issues');
    });
  });

  describe('fetchLabelsForIssue', () => {
    it('should fetch labels for a given issue', async () => {
      moctokit.rest.issues.listLabelsOnIssue.mockResolvedValueOnce(
        createMockResponse([
          createMockLabel(),
          createMockLabel({
            id: 208045947,
            name: 'enhancement',
            description: 'New feature request'
          })
        ])
      );

      const result = await manager.fetchLabelsForIssue(1);
      expect(result).toEqual(['bug', 'enhancement']);
      expect(core.info).toHaveBeenCalledWith('Fetching labels for issue 1');
    });

    it('should handle issues with no labels', async () => {
      moctokit.rest.issues.listLabelsOnIssue.mockResolvedValueOnce(
        createMockResponse([])
      );

      const result = await manager.fetchLabelsForIssue(1);
      expect(result).toEqual([]);
      expect(core.info).toHaveBeenCalledWith('Fetching labels for issue 1');
    });

    it('should handle API errors gracefully', async () => {
      moctokit.rest.issues.listLabelsOnIssue.mockRejectedValueOnce(new Error('API Error'));

      const result = await manager.fetchLabelsForIssue(1);
      expect(result).toEqual([]);
      expect(core.info).toHaveBeenCalledWith('Fetching labels for issue 1');
    });
  });
});
