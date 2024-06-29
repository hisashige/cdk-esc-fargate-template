import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  SecurityGroup,
  Instance,
  InstanceType,
  SubnetType,
  AmazonLinuxGeneration,
  AmazonLinuxImage,
} from "aws-cdk-lib/aws-ec2";
import { Role, ServicePrincipal, ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Vpc } from "./construct/vpc";

interface SsmEc2StackProps extends StackProps {
  readonly resourceName: string;
  readonly vpc: Vpc;
  readonly securityGroup: SecurityGroup; // Add this line
}

export class SsmEc2Stack extends Stack {
  constructor(scope: Construct, id: string, props: SsmEc2StackProps) {
    super(scope, id, props);

    const { resourceName, vpc, securityGroup } = props; // Update this line

    // IAM Role for EC2 instance with SSM policies
    const role = new Role(this, `${resourceName}-ssm-role`, {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    });

    // EC2 instance with SSM agent
    new Instance(this, `${resourceName}-ssm-instance`, {
      vpc: vpc.value,
      instanceType: new InstanceType("t3.micro"),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      securityGroup: securityGroup,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_ISOLATED,
      },
      role,
    });
  }
}
