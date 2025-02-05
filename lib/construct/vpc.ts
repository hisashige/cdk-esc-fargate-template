import type { SelectedSubnets } from "aws-cdk-lib/aws-ec2";
import { GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService, IpAddresses, SubnetType, Vpc as _Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class Vpc extends Construct {
  // NOTE: 別スタックから参照できるようにする
  public readonly value: _Vpc;
  private readonly ecsIsolatedSubnetName: string;
  private readonly rdsIsolatedSubnetName: string;

  constructor(scope: Construct, id: string, private readonly resourceName: string) {
    super(scope, id);
    this.ecsIsolatedSubnetName = `${this.resourceName}-ecs-isolated`;
    this.rdsIsolatedSubnetName = `${this.resourceName}-rds-isolated`;

    this.value = new _Vpc(this, "Vpc", {
      vpcName: `${this.resourceName}-vpc`,
      availabilityZones: ["ap-northeast-1a", "ap-northeast-1c"],
      // NOTE: ネットワークアドレス部:16bit, ホストアドレス部:16bit
      ipAddresses: IpAddresses.cidr("192.168.0.0/16"),
      subnetConfiguration: [
        {
          name: `${this.resourceName}-public`,
          cidrMask: 26, // 小規模なので`/26`で十分(ネットワークアドレス部: 26bit, ホストアドレス部: 6bit)
          subnetType: SubnetType.PUBLIC,
        },
        // NOTE: ECSを配置するプライベートサブネット
        //       ISOLATEDを指定(基本的にVPCエンドポイントを利用する。cognitoのみVPCエンドポイントがないので、NAT Gatewayは一応作る。)
        {
          name: this.ecsIsolatedSubnetName,
          cidrMask: 26,
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        // NOTE: RDSを配置するプライベートサブネット
        {
          name: this.rdsIsolatedSubnetName,
          cidrMask: 26,
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
      natGateways: 1,
    });

    // NOTE: VPCエンドポイントを作成
    this.value.addInterfaceEndpoint("EcrEndpoint", {
      service: InterfaceVpcEndpointAwsService.ECR,
    });
    this.value.addInterfaceEndpoint("EcrDkrEndpoint", {
      service: InterfaceVpcEndpointAwsService.ECR_DOCKER,
    });
    this.value.addInterfaceEndpoint("CwLogsEndpoint", {
      service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    });
    this.value.addGatewayEndpoint("S3Endpoint", {
      service: GatewayVpcEndpointAwsService.S3,
      subnets: [
        {
          subnets: this.value.isolatedSubnets,
        },
      ],
    });

    // SSM用のVPCエンドポイントを追加
    this.value.addInterfaceEndpoint("SsmEndpoint", {
      service: InterfaceVpcEndpointAwsService.SSM,
    });
    this.value.addInterfaceEndpoint("SsmMessagesEndpoint", {
      service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
    });
    this.value.addInterfaceEndpoint("Ec2MessagesEndpoint", {
      service: InterfaceVpcEndpointAwsService.EC2_MESSAGES,
    });
  }

  public getPublicSubnets(): SelectedSubnets {
    return this.value.selectSubnets({ subnetType: SubnetType.PUBLIC });
  }

  public getEcsIsolatedSubnets(): SelectedSubnets {
    return this.value.selectSubnets({ subnetGroupName: this.ecsIsolatedSubnetName });
  }

  public getRdsIsolatedSubnets(): SelectedSubnets {
    return this.value.selectSubnets({ subnetGroupName: this.rdsIsolatedSubnetName });
  }
}
