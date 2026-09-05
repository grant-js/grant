/**
 * The web container image.
 *
 * Separate asset from the API's: different Dockerfile stage, different build context
 * needs, and a change to one should not re-arm the other's deploy. Both are built from
 * the workspace root because each Dockerfile copies the pnpm workspace.
 *
 * As with the API, `DockerImageAsset` does not run `docker build` during `cdk synth` —
 * it fingerprints the context and writes an asset manifest, and the build happens at
 * publish time. That is what keeps `synth:check` a seconds-long job with no daemon.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DockerImageAsset, type Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

export interface WebImageProps {
  readonly contextPath?: string;
  readonly platform?: Platform;
}

export class WebImage extends Construct {
  public readonly asset: DockerImageAsset;

  constructor(scope: Construct, id: string, props: WebImageProps = {}) {
    super(scope, id);

    this.asset = new DockerImageAsset(this, 'Asset', {
      directory: props.contextPath ?? REPO_ROOT,
      file: 'apps/web/Dockerfile',
      target: 'runner-lambda',
      ...(props.platform ? { platform: props.platform } : {}),
    });
  }
}
