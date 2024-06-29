import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { SecurityGroup, Port, Peer } from "aws-cdk-lib/aws-ec2";
import { Vpc } from "./construct/vpc";
import { Rds } from "./construct/rds";

interface RdsStackProps extends StackProps {
  readonly resourceName: string;
  readonly vpc: Vpc;
  readonly rdsSecurityGroup: SecurityGroup;
  readonly ssmSecurityGroup: SecurityGroup;
}

export class RdsStack extends Stack {
  public readonly secretManagerArn: string;

  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    const { resourceName, vpc, rdsSecurityGroup, ssmSecurityGroup } = props;

    // RDSの作成とシークレットマネージャーへの保存
    const rds = new Rds(this, "Rds", {
      vpc: vpc.value,
      resourceName,
      securityGroup: rdsSecurityGroup,
      subnets: vpc.getRdsIsolatedSubnets(),
    });

    // SSM EC2インスタンスセキュリティグループからのアクセスを許可
    rdsSecurityGroup.addIngressRule(
      Peer.securityGroupId(ssmSecurityGroup.securityGroupId),
      Port.tcp(3306), // MySQLの場合のポート番号
      "Allow SSM EC2 instances to access RDS"
    );
  }
}
