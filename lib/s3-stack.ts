import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  HttpMethods,
} from "aws-cdk-lib/aws-s3";
import { DOMAIN_NAME } from "../config/const";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { AnyPrincipal } from "aws-cdk-lib/aws-iam";

interface S3StackProps extends StackProps {
  readonly resourceName: string;
}

export class S3Stack extends Stack {
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props);

    const { resourceName } = props;

    // S3バケットの作成
    this.bucket = new Bucket(this, "MagazineBucket", {
      bucketName: `${resourceName}-magazine`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
    });

    // バケットポリシーの設定
    this.bucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal()],
        actions: ["s3:GetObject"],
        resources: [`${this.bucket.bucketArn}/*`],
      })
    );

    // CORS設定の追加
    this.bucket.addCorsRule({
      allowedMethods: [HttpMethods.GET],
      allowedOrigins: [`https://${DOMAIN_NAME}`],
      allowedHeaders: ["*"],
      exposedHeaders: ["ETag"],
      maxAge: 3000,
    });
  }
}
