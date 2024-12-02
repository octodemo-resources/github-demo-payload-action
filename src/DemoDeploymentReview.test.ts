import { describe, expect, it } from 'vitest';
import { createMockDeployment } from '../test/moctokit/DeploymentMockFactory.js';
import { createMocktokit } from '../test/moctokit/Mocktokit.js';
import { DemoDeploymentReview } from './DemoDeploymentReview.js';



describe('DemoDeploymentReview', () => {
  describe("createDemoReview()", async () => {
    it('throws if returned deployment has different task than "demo:deployment"', async () => {
      const moctokit = createMocktokit();
      moctokit.paginate.mockResolvedValueOnce( [createMockDeployment({ task: 'not-a-demo' })]);

      await expect(DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' })).rejects.toThrow("Invalid payload type not-a-demo");
    });
  });

  describe("getAllDemos", async () => {
    it('returns all demos from API().', async () => {
      const moctokit = createMocktokit();
      moctokit.paginate.mockResolvedValueOnce( [createMockDeployment(), createMockDeployment()]);


      const demoDeploymentReview = await DemoDeploymentReview.createDemoReview(moctokit, { owner: 'octodemo', repo: 'bootstrap' });

      const results = await demoDeploymentReview.getAllDemoDeployments();

      expect(results).toBeDefined();
      expect(results).toHaveLength(2);
    });

  });

});
