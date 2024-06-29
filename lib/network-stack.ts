import { Stack, StackProps } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { Vpc } from "./construct/vpc";
import { SecurityGroup } from "./construct/security-group";

interface NetworkStackProps extends StackProps {
  readonly resourceName: string;
}

export class NetworkStack extends Stack {
  public readonly vpc: Vpc;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly rdsSecurityGroup: ec2.SecurityGroup;
  public readonly ssmSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    // VPC
    this.vpc = new Vpc(this, "Vpc", props.resourceName);

    // セキュリティグループ
    const securityGroups = new SecurityGroup(this, "SecurityGroup", {
      vpc: this.vpc.value,
      resourceName: props.resourceName,
    });

    this.albSecurityGroup = securityGroups.albSecurityGroup;
    this.ecsSecurityGroup = securityGroups.ecsSecurityGroup;
    this.rdsSecurityGroup = securityGroups.rdsSecurityGroup;
    this.ssmSecurityGroup = securityGroups.ssmSecurityGroup;
  }
}
