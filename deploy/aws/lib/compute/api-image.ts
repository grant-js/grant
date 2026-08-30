/**
 * The API container image.
 *
 * One asset, shared by the migrate task and (in 4c) the serving function. ADR 0003
 * settled that: one image serves Lambda, Fargate and Kubernetes, so "works in staging,
 * breaks on Lambda" cannot come from image drift. The `runner-lambda` target is that
 * image plus the Lambda Web Adapter binary, which is inert anywhere the Lambda runtime
 * is not reading `/opt/extensions` — so Fargate runs the identical artifact.
 *
 * Build timing matters here. `DockerImageAsset` does **not** run `docker build` during
 * `cdk synth`: it fingerprints the build context and writes an asset manifest, and the
 * build happens at publish time during `cdk deploy`. That is what keeps `synth:check`
 * in CI a seconds-long job on a machine with no Docker daemon, while a real deploy
 * still builds from source.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

/** The build context is the workspace root: the Dockerfile copies the pnpm workspace. */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

export interface ApiImageProps {
  /**
   * Build context. Defaults to the workspace root.
   *
   * An adopter consuming this as a library will not have the API source on disk, and
   * should pass a pre-published image to the constructs instead of using this one.
   */
  readonly contextPath?: string;

  /**
   * Target architecture.
   *
   * Host architecture by default, deliberately. The brief recorded that a green-field
   * adopter on x86 cannot build the arm64 image locally — phase B proved it, with no
   * `qemu-aarch64` binfmt handler the build dies on `exec format error`. Defaulting to
   * the host means a first deploy needs nothing pre-published; the production path
   * passes a CI-built image from ECR instead.
   */
  readonly platform?: Platform;
}

export class ApiImage extends Construct {
  public readonly asset: DockerImageAsset;
  public readonly containerImage: ContainerImage;

  constructor(scope: Construct, id: string, props: ApiImageProps = {}) {
    super(scope, id);

    this.asset = new DockerImageAsset(this, 'Asset', {
      directory: props.contextPath ?? REPO_ROOT,
      file: 'apps/api/Dockerfile',
      target: 'runner-lambda',
      ...(props.platform ? { platform: props.platform } : {}),
    });

    this.containerImage = ContainerImage.fromDockerImageAsset(this.asset);
  }

  /**
   * Identity of the built image.
   *
   * Changes whenever the build context does, which is what makes it usable as the
   * "should the migration run again?" signal: migrations ship inside the image, so a
   * changed image is exactly the condition under which there might be new ones.
   */
  public get imageIdentifier(): string {
    return this.asset.imageTag;
  }
}
