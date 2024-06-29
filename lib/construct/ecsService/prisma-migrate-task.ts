import { Construct } from "constructs";
import {
  Cluster,
  FargateTaskDefinition,
  ContainerImage,
  AwsLogDriver,
} from "aws-cdk-lib/aws-ecs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { SecurityGroup, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import { IRepository } from "aws-cdk-lib/aws-ecr";

interface PrismaMigrateTaskProps {
  cluster: Cluster;
  resourceName: string;
  ecrRepository: IRepository;
  subnets: SubnetSelection;
  securityGroup: SecurityGroup;
  databaseUrl: string;
}

export class EcsPrismaMigrateTask extends Construct {
  constructor(scope: Construct, id: string, props: PrismaMigrateTaskProps) {
    super(scope, id);

    const taskDefinition = new FargateTaskDefinition(
      this,
      "PrismaMigrateTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
      }
    );

    const logGroup = new LogGroup(this, "PrismaMigrateLogGroup", {
      retention: RetentionDays.ONE_WEEK,
    });

    taskDefinition.addContainer("PrismaMigrateContainer", {
      image: ContainerImage.fromEcrRepository(props.ecrRepository),
      logging: AwsLogDriver.awsLogs({
        logGroup,
        streamPrefix: "prisma-migrate",
      }),
      environment: {
        DATABASE_URL: props.databaseUrl,
      },
      command: ["yarn", "prisma", "migrate", "deploy"],
    });

    // ECS Task Definition only, not creating a service
  }
}
