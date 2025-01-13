
import { describe, expect, it } from 'vitest';
import { parseDemoMetadata } from './DemoMetadata';

describe('DemoMetadata', () => {

  describe('#parseDemoMetadata', () => {

    it ('should validate a repository template definition', async () => {
      const payload = {
        name: 'Bookstore',
        version: 1,

        resources: [
          'github'
        ],

        framework: {
          variant: 'terraform',

          terraform: {
            stack_path: '/tmp/stack',
            lifecycle_scripts: {
              create: {
                post: 'echo "create post"',
              },
            }
          }
        }
      };

      const result = await parseDemoMetadata(JSON.stringify(payload));
      expect(result).toBeDefined();

      expect(result.name).toBe(payload.name);
      expect(result.version).toBe(1);
      expect(result.resources).toEqual(payload.resources);
    });

    it ('should validate a repository template definition with templated files', async () => {
      const payload = {
        name: 'Bookstore',
        version: 1,

        resources: [
          'github'
        ],

        framework: {
          variant: 'terraform',

          templated_files: [
            'template.json',
            'template.tf'
          ],

          terraform: {
            stack_path: '/tmp/stack',
            lifecycle_scripts: {
              create: {
                post: 'echo "create post"',
              },
            }
          }
        }
      };

      const result = await parseDemoMetadata(JSON.stringify(payload));
      expect(result).toBeDefined();

      expect(result.name).toBe(payload.name);
      expect(result.version).toBe(1);
      expect(result.resources).toEqual(payload.resources);

      expect(result.framework.templated_files).toEqual(payload.framework.templated_files);
    });
  });
});