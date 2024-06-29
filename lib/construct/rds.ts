import { Construct } from "constructs";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  NetworkType,
  MysqlEngineVersion,
} from "aws-cdk-lib/aws-rds";
import type { SecurityGroup, SubnetSelection, Vpc } from "aws-cdk-lib/aws-ec2";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";

interface RdsProps {
  vpc: Vpc;
  securityGroup: SecurityGroup;
  subnets: SubnetSelection;
  resourceName: string;
}

export class Rds extends Construct {
  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id);

    // パスワードを自動生成してSecrets Managerに保存
    const rdsCredentials = Credentials.fromGeneratedSecret("api_user", {
      secretName: `/${props.resourceName}/rds/`,
    });

    // プライマリインスタンスの作成
    new DatabaseInstance(this, "RdsPrimaryInstance", {
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_0_32,
      }),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      credentials: rdsCredentials,
      databaseName: "db",
      vpc: props.vpc,
      vpcSubnets: props.subnets,
      networkType: NetworkType.IPV4,
      securityGroups: [props.securityGroup],
      availabilityZone: "ap-northeast-1a",
    });
  }
}
