#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";
import { NetworkStack } from "../lib/network-stack";
import { EcrStack } from "../lib/ecr-stack";
import { AppStack } from "../lib/app-stack";
import { RdsStack } from "../lib/rds-stack";
import { DnsStack } from "../lib/dns-stack";
import { DOMAIN_NAME } from "../config/const";
import { SsmEc2Stack } from "../lib/ssm-ec2-stack";
import { S3Stack } from "../lib/s3-stack";
import { CognitoStack } from "../lib/cognito-stack";
import { IamStack } from "../lib/iam-stack";

dotenv.config({ path: ".env" });

const accountId = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const resourceName = "sample-app-stack";
const env = { account: accountId, region };

if (!accountId || !region) {
  throw new Error("Environmental variables are not set properly");
}

const app = new cdk.App();

const networkStack = new NetworkStack(app, "NetworkStack", {
  env,
  resourceName,
});

// DNS検証とSSL証明書取得
const dnsStack = new DnsStack(app, "DnsStack", {
  env,
  resourceName,
  domainName: DOMAIN_NAME,
});

const ecrStack = new EcrStack(app, "EcrStack", {
  env,
  resourceName,
});

const s3Stack = new S3Stack(app, "S3Stack", {
  env,
  resourceName,
});

const cognitoStack = new CognitoStack(app, "CognitoStack", {
  env,
  resourceName,
});

new IamStack(app, "IamStack", {
  env,
  resourceName,
  cognitoUserPoolArn: cognitoStack.userPoolArn,
  s3BucketArn: s3Stack.bucket.bucketArn,
});

const ssmEc2Stack = new SsmEc2Stack(app, "SsmEc2Stack", {
  env,
  resourceName,
  vpc: networkStack.vpc,
  securityGroup: networkStack.ssmSecurityGroup, // Add this line
});

new RdsStack(app, "RdsStack", {
  env,
  resourceName,
  vpc: networkStack.vpc,
  rdsSecurityGroup: networkStack.rdsSecurityGroup,
  ssmSecurityGroup: networkStack.ssmSecurityGroup,
});

new AppStack(app, "AppStack", {
  env,
  resourceName,
  vpc: networkStack.vpc,
  albSecurityGroup: networkStack.albSecurityGroup,
  ecsSecurityGroup: networkStack.ecsSecurityGroup,
  apiRepository: ecrStack.apiRepository,
  liffRepository: ecrStack.liffRepository,
  manageRepository: ecrStack.manageRepository,
  migrationRepository: ecrStack.migrationRepository,
  s3BucketName: s3Stack.bucket.bucketName,
  cognitoClientId: cognitoStack.userPoolClientId,
  cognitoUserPoolId: cognitoStack.userPoolId,
});
