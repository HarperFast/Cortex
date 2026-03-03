---
name: deploying-to-harper-fabric
description: How to deploy a Harper application to the Harper Fabric cloud.
---

# Deploying to Harper Fabric

Instructions for the agent to follow when deploying to Harper Fabric.

## When to Use

Use this skill when you are ready to move your Harper application from local development to a cloud-hosted environment.

## Steps

1. **Sign up**: Create an account at [https://fabric.harper.fast/](https://fabric.harper.fast/) and create a cluster.
2. **Configure Environment**: Add your cluster credentials and cluster application URL to `.env`:
   ```bash
   CLI_TARGET_USERNAME='YOUR_CLUSTER_USERNAME'
   CLI_TARGET_PASSWORD='YOUR_CLUSTER_PASSWORD'
   CLI_TARGET='YOUR_CLUSTER_URL'
   ```
3. **Deploy From Local Environment**: Run `npm run deploy`.
4. **Set up CI/CD**: Configure `.github/workflows/deploy.yaml` and set repository secrets for automated deployments.
