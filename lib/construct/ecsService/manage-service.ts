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

interface EcsManageServiceProps {
  cluster: Cluster;
  resourceName: string;
  ecrRepository: IRepository;
  securityGroup: SecurityGroup;
  subnets: SubnetSelection;
  port: number;
}

export class EcsManageService extends Construct {
  public readonly fargateService: FargateService;

  constructor(scope: Construct, id: string, props: EcsManageServiceProps) {
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

    taskDefinition.addContainer(`${props.resourceName}Container`, {
      image: ContainerImage.fromEcrRepository(props.ecrRepository),
      portMappings: [{ containerPort: props.port, hostPort: props.port }],
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
