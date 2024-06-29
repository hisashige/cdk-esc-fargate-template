import type { Vpc } from "aws-cdk-lib/aws-ec2";
import {
  Peer,
  Port,
  SecurityGroup as _SecurityGroup,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface SecurityGroupProps {
  vpc: Vpc;
  resourceName: string;
}

export class SecurityGroup extends Construct {
  public readonly albSecurityGroup: _SecurityGroup;
  public readonly ecsSecurityGroup: _SecurityGroup;
  public readonly rdsSecurityGroup: _SecurityGroup;
  public readonly ssmSecurityGroup: _SecurityGroup; // Add this line

  constructor(scope: Construct, id: string, props: SecurityGroupProps) {
    super(scope, id);
    this.albSecurityGroup = this.createAlbSecurityGroup(
      props.vpc,
      props.resourceName
    );
    this.ecsSecurityGroup = this.createEcsSecurityGroup(
      props.vpc,
      props.resourceName
    );
    this.rdsSecurityGroup = this.createRdsSecurityGroup(
      props.vpc,
      props.resourceName
    );
    this.ssmSecurityGroup = this.createSsmSecurityGroup(
      props.vpc,
      props.resourceName
    ); // Add this line
  }

  /**
   * ALB に関連付けるセキュリティグループを作成する
   * - インバウンド通信: 任意の IPv4 アドレスからの HTTP, HTTPS アクセスを許可
   * - アウトバウンド通信: すべて許可
   */
  private createAlbSecurityGroup(
    vpc: Vpc,
    resourceName: string
  ): _SecurityGroup {
    const sg = new _SecurityGroup(this, "AlbSecurityGroup", {
      securityGroupName: `${resourceName}-alb-sg`,
      vpc,
      description:
        "Allow HTTP and HTTPS inbound traffic. Allow all outbound traffic.",
      allowAllOutbound: true, // すべてのアウトバウンドトラフィックを許可
    });
    sg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      "Allow HTTP inbound traffic"
    );
    sg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(443),
      "Allow HTTPS inbound traffic"
    );

    return sg;
  }

  /**
   * ECS に関連付けるセキュリティグループを作成する
   * - インバウンド通信: ALB からの HTTP アクセスを許可
   * - アウトバウンド通信: すべて許可
   */
  private createEcsSecurityGroup(
    vpc: Vpc,
    resourceName: string
  ): _SecurityGroup {
    const sg = new _SecurityGroup(this, "EcsSecurityGroup", {
      securityGroupName: `${resourceName}-ecs-sg`,
      vpc,
      description: "Allow HTTP inbound traffic. Allow all outbound traffic.",
      allowAllOutbound: true,
    });
    sg.addIngressRule(
      this.albSecurityGroup,
      Port.tcp(80),
      "Allow HTTP inbound traffic"
    );

    return sg;
  }

  /**
   * RDS に関連付けるセキュリティグループを作成する
   * - インバウンド通信: ECSからの MySQL アクセスを許可(ポート: 3306)
   * - アウトバウンド通信: すべて許可
   */
  private createRdsSecurityGroup(
    vpc: Vpc,
    resourceName: string
  ): _SecurityGroup {
    const sg = new _SecurityGroup(this, "RdsSecurityGroup", {
      securityGroupName: `${resourceName}-rds-sg`,
      vpc,
      description: "Allow MySQL inbound traffic. Allow all outbound traffic.",
      allowAllOutbound: true,
    });
    sg.addIngressRule(
      this.ecsSecurityGroup,
      Port.tcp(3306),
      "Allow MySQL inbound traffic"
    );
    return sg;
  }

  /**
   * SSM 用のセキュリティグループを作成する
   * - インバウンド通信: 任意の IPv4 アドレスからの SSH アクセスを許可
   * - インバウンド通信: 任意の IPv4 アドレスからの MySQL アクセスを許可
   * - アウトバウンド通信: すべて許可
   */
  private createSsmSecurityGroup(
    vpc: Vpc,
    resourceName: string
  ): _SecurityGroup {
    const sg = new _SecurityGroup(this, "SsmSecurityGroup", {
      securityGroupName: `${resourceName}-ssm-sg`,
      vpc,
      description:
        "Allow SSH and MySQL inbound traffic. Allow all outbound traffic.",
      allowAllOutbound: true,
    });
    sg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(22),
      "Allow SSH inbound traffic"
    );
    sg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(3306),
      "Allow MySQL inbound traffic"
    );

    return sg;
  }
}
