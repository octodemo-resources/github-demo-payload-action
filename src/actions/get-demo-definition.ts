import * as core from '@actions/core';
import * as github from '@actions/github';
import { inspect } from 'util';
import { DemoDeployment } from '../DemoDeployment.js';
import { GitHubDeploymentManager } from '../GitHubDeploymentManager.js';
import { getOctokit, getRequiredInput, setOutput } from '../util.js';

async function run() {
  try {
    await exec();
  } catch (err: any) {
    core.debug(inspect(err))
    core.setFailed(err);
  }
}
run();


async function exec() {
  const deploymentId = getRequiredInput('deployment_id');

  const octokit = getOctokit();
  const deploymentManager = new GitHubDeploymentManager(github.context.repo, octokit, github.context.ref);

  const demoDeployment: DemoDeployment = await deploymentManager.getDemoDeploymentById(Number.parseInt(deploymentId));

  core.startGroup('Demo Deployment');
  setOutput('demo_deployment_id', demoDeployment.id);
  setOutput('demo_deployment_name', demoDeployment.name);
  setOutput('demo_deployment_description', demoDeployment.description);

  const uuid = demoDeployment.uuid;
  if (uuid) {
    setOutput('demo_deployment_uuid', uuid);
  }

  const trackingIssue = demoDeployment.getTrackingIssue();
  if (trackingIssue) {
    setOutput('communication_issue_number', trackingIssue);
  }

  const demoPayload = demoDeployment.payload;
  if (demoPayload) {
    setOutput('demo_deployment_payload', JSON.stringify(demoPayload));
    //TODO split these out

    //TODO finish this off
    //const payload = demoDeployment.payload;

    //core.startGroup('Demo Deployment')
    //core.info(`id = ${demoDeployment.id}`);
    //core.endGroup();

    //core.startGroup('Action outputs');
    //core.info(JSON.stringify(demoDeployment.getOutputs(), null, 2));
    //core.endGroup();

    //core.startGroup('Terraform variables');
    //core.info(JSON.stringify(demoDeployment.getTerraformVariables(), null, 2));
  }
  core.endGroup();
}
