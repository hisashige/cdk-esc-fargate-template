import { Construct } from "constructs";
import { Vpc, SecurityGroup, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  TargetType,
  ListenerCondition,
  ListenerAction,
  Protocol,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Duration } from "aws-cdk-lib";
import { FargateService } from "aws-cdk-lib/aws-ecs";
import { API_PORT, LIFF_PORT, MANAGE_PORT } from "../../config/const";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";

interface AlbProps {
  vpc: Vpc;
  resourceName: string;
  securityGroup: SecurityGroup;
  subnets: SubnetSelection;
  apiService: FargateService;
  liffService: FargateService;
  manageService: FargateService;
  certificate: ICertificate;
}

export class Alb extends Construct {
  public readonly value: ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: AlbProps) {
    super(scope, id);

    const {
      vpc,
      resourceName,
      securityGroup,
      subnets,
      apiService,
      liffService,
      manageService,
      certificate,
    } = props;

    // NOTE: ALBの作成
    this.value = new ApplicationLoadBalancer(this, "Alb", {
      loadBalancerName: `${resourceName}-alb`,
      vpc: vpc,
      internetFacing: true,
      securityGroup: securityGroup,
      vpcSubnets: subnets,
    });

    // HTTPリスナーの作成(リダイレクト設定)
    const httpListener = this.value.addListener("HttpListener", {
      protocol: ApplicationProtocol.HTTP,
      port: 80,
      defaultAction: ListenerAction.redirect({
        protocol: ApplicationProtocol.HTTPS,
        port: "443",
        permanent: true,
      }),
    });

    // HTTPSリスナーの作成(こちらを利用)
    const httpsListener = this.value.addListener("HttpsListener", {
      protocol: ApplicationProtocol.HTTPS,
      port: 443,
      certificates: [certificate],
      defaultAction: ListenerAction.fixedResponse(404, {
        contentType: "text/plain",
        messageBody: "Not Found",
      }),
    });

    // ターゲットグループの作成
    const apiTargetGroup = new ApplicationTargetGroup(this, "ApiTargetGroup", {
      vpc: vpc,
      port: API_PORT,
      targetType: TargetType.IP,
      protocol: ApplicationProtocol.HTTP,
      targets: [apiService],
      healthCheck: {
        path: "/api/v1",
        interval: Duration.minutes(1),
        protocol: Protocol.HTTP,
      },
    });

    const liffTargetGroup = new ApplicationTargetGroup(
      this,
      "LiffTargetGroup",
      {
        vpc: vpc,
        port: LIFF_PORT,
        targetType: TargetType.IP,
        protocol: ApplicationProtocol.HTTP,
        targets: [liffService],
        healthCheck: {
          path: "/liff/",
          interval: Duration.minutes(1),
          protocol: Protocol.HTTP,
        },
      }
    );

    const manageTargetGroup = new ApplicationTargetGroup(
      this,
      "ManageTargetGroup",
      {
        vpc: vpc,
        port: MANAGE_PORT,
        targetType: TargetType.IP,
        protocol: ApplicationProtocol.HTTP,
        targets: [manageService],
        healthCheck: {
          path: "/manage/login",
          interval: Duration.minutes(1),
          protocol: Protocol.HTTP,
        },
      }
    );

    // リスナールールの追加
    httpsListener.addAction("ApiAction", {
      priority: 1,
      conditions: [ListenerCondition.pathPatterns(["/api/*"])],
      action: ListenerAction.forward([apiTargetGroup]),
    });

    httpsListener.addAction("LiffAction", {
      priority: 2,
      conditions: [ListenerCondition.pathPatterns(["/liff/*"])],
      action: ListenerAction.forward([liffTargetGroup]),
    });

    httpsListener.addAction("ManageAction", {
      priority: 3,
      conditions: [ListenerCondition.pathPatterns(["/manage*"])],
      action: ListenerAction.forward([manageTargetGroup]),
    });

    httpsListener.addAction("RedirectRootToManage", {
      priority: 4,
      conditions: [ListenerCondition.pathPatterns(["/", "/manage"])],
      action: ListenerAction.redirect({
        host: "#{host}",
        path: "/manage/",
        port: "#{port}",
        protocol: "#{protocol}",
        query: "#{query}",
        permanent: true,
      }),
    });
  }
}
