import { Fn, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Vpc } from "./construct/vpc";
import { Alb } from "./construct/alb";
import { Cluster } from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import type { IRepository } from "aws-cdk-lib/aws-ecr";
import { API_PORT, LIFF_PORT, MANAGE_PORT } from "../config/const";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { EcsPrismaMigrateTask } from "./construct/ecsService/prisma-migrate-task";
import { EcsApiService } from "./construct/ecsService/api-service";
import { EcsLiffService } from "./construct/ecsService/liff-service";
import { EcsManageService } from "./construct/ecsService/manage-service";
import { getSecrets } from "./util/secret-fetcher";

interface NphdAppStackProps extends StackProps {
  readonly resourceName: string;
  readonly vpc: Vpc;
  readonly albSecurityGroup: ec2.SecurityGroup;
  readonly ecsSecurityGroup: ec2.SecurityGroup;
  readonly apiRepository: IRepository;
  readonly liffRepository: IRepository;
  readonly manageRepository: IRepository;
  readonly migrationRepository: IRepository;
  readonly s3BucketName: string;
  readonly cognitoClientId: string;
  readonly cognitoUserPoolId: string;
}

export class AppStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: NphdAppStackProps
  ) {
    super(scope, id, props);

    const {
      resourceName,
      vpc,
      albSecurityGroup,
      ecsSecurityGroup,
      apiRepository,
      liffRepository,
      manageRepository,
      migrationRepository,
      s3BucketName,
      cognitoClientId,
      cognitoUserPoolId,
    } = props;

    // シークレットマネージャーから値を取得
    const secretValues = getSecrets(
      this
    );

    // ECS Clusterの作成
    const cluster = new Cluster(this, "EcsCluster", {
      clusterName: `${resourceName}-cluster`,
      vpc: vpc.value,
    });

    // ECS Servicesの作成
    const ecsApi = new EcsApiService(this, "EcsFargateApi", {
      cluster,
      resourceName: `${resourceName}-api`,
      ecrRepository: apiRepository,
      securityGroup: ecsSecurityGroup,
      subnets: vpc.getEcsIsolatedSubnets(),
      port: API_PORT,
      secretValues,
      s3BucketName,
      cognitoClientId,
      cognitoUserPoolId,
    });

    const ecsLiff = new EcsLiffService(this, "EcsFargateLiff", {
      cluster,
      resourceName: `${resourceName}-liff`,
      ecrRepository: liffRepository,
      securityGroup: ecsSecurityGroup,
      subnets: vpc.getEcsIsolatedSubnets(),
      port: LIFF_PORT,
    });

    const ecsManage = new EcsManageService(this, "EcsFargateManage", {
      cluster,
      resourceName: `${resourceName}-manage`,
      ecrRepository: manageRepository,
      securityGroup: ecsSecurityGroup,
      subnets: vpc.getEcsIsolatedSubnets(),
      port: MANAGE_PORT,
    });

    new EcsPrismaMigrateTask(this, "EcsFargatePrismaMigrate", {
      cluster,
      resourceName,
      ecrRepository: migrationRepository,
      securityGroup: ecsSecurityGroup,
      databaseUrl: secretValues.databaseUrl,
      subnets: vpc.getEcsIsolatedSubnets(),
    });

    // 証明書のインポート
    const certificateArn = Fn.importValue(`${resourceName}-certificate-arn`);
    const certificate = Certificate.fromCertificateArn(
      this,
      "Certificate",
      certificateArn
    );

    // ALBとターゲットグループの作成
    const alb = new Alb(this, "Alb", {
      vpc: vpc.value,
      resourceName,
      securityGroup: albSecurityGroup,
      subnets: vpc.getPublicSubnets(),
      apiService: ecsApi.fargateService,
      liffService: ecsLiff.fargateService,
      manageService: ecsManage.fargateService,
      certificate,
    });

    // セキュリティグループのルールを設定
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(API_PORT),
      "Allow traffic from ALB to ECS API service"
    );
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(LIFF_PORT),
      "Allow traffic from ALB to ECS LIFF service"
    );
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(MANAGE_PORT),
      "Allow traffic from ALB to ECS Manage service"
    );
  }
}
