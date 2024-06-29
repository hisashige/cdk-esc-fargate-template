import { Construct } from "constructs";
import {
  AwsLogDriver,
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  TaskDefinitionRevision,
} from "aws-cdk-lib/aws-ecs";
import type { IRepository } from "aws-cdk-lib/aws-ecr";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import type { SecurityGroup, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import { Secrets } from "../../util/secret-fetcher";

interface EcsApiServiceProps {
  cluster: Cluster;
  resourceName: string;
  ecrRepository: IRepository;
  securityGroup: SecurityGroup;
  subnets: SubnetSelection;
  port: number;
  secretValues: Secrets;
  s3BucketName: string;
  cognitoClientId: string;
  cognitoUserPoolId: string;
}

export class EcsApiService extends Construct {
  public readonly fargateService: FargateService;

  constructor(scope: Construct, id: string, props: EcsApiServiceProps) {
    super(scope, id);

    const taskDefinition = new FargateTaskDefinition(
      this,
      `${props.resourceName}TaskDefinition`,
      {
        cpu: 256,
        memoryLimitMiB: 512,
      }
    );

    const logDriver = new AwsLogDriver({
      streamPrefix: `${props.resourceName}`,
      logRetention: RetentionDays.ONE_DAY,
    });

    const secretValues = props.secretValues
    taskDefinition.addContainer(`${props.resourceName}Container`, {
      image: ContainerImage.fromEcrRepository(props.ecrRepository),
      portMappings: [{ containerPort: props.port, hostPort: props.port }],
      environment: {
        NODE_ENV: "production",
        DATABASE_URL: secretValues.databaseUrl,
        AWS_ACCESS_KEY_ID: secretValues.apiAwsSecretValues.accessKeyId,
        AWS_SECRET_ACCESS_KEY: secretValues.apiAwsSecretValues.secretAccessKey,
        S3_BUCKET_NAME: props.s3BucketName,
        COGNITO_CLIENT_ID: props.cognitoClientId,
        COGNITO_USER_POOL_ID: props.cognitoUserPoolId,
        LINE_CHANNEL_ACCESS_TOKEN:
          secretValues.lineSecretValues.LINE_CHANNEL_ACCESS_TOKEN,
        LINE_CHANNEL_SECRET: secretValues.lineSecretValues.LINE_CHANNEL_SECRET,
        BEFORE_USER_REGISTRATION_RICHMENU_ID:
          secretValues.lineSecretValues.BEFORE_USER_REGISTRATION_RICHMENU_ID,
        AFTER_USER_REGISTRATION_RICHMENU_ID:
          secretValues.lineSecretValues.AFTER_USER_REGISTRATION_RICHMENU_ID,
        TIMESTAMP: `${Date.now()}`, // cdk deployでSecret Managerの値を最新のものを取得して毎回作り直される様に、ダミーの環境変数を追加
      },
      logging: logDriver,
    });

    this.fargateService = new FargateService(
      this,
      `${props.resourceName}FargateService`,
      {
        cluster: props.cluster,
        taskDefinition,
        desiredCount: 2,
        securityGroups: [props.securityGroup],
        vpcSubnets: props.subnets,
        taskDefinitionRevision: TaskDefinitionRevision.LATEST,
      }
    );
  }
}
