import { Octokit } from '@octokit/rest';
import { DeepMockProxy, mockDeep } from 'vitest-mock-extended';

function createMocktokit(): DeepMockProxy<Octokit> {
  const mockObj: DeepMockProxy<Octokit> = mockDeep<Octokit>();

  return mockObj;
}

export {
  createMocktokit
};
