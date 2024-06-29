import { Construct } from "constructs";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";

interface DnsStackProps extends StackProps {
  readonly resourceName: string;
  readonly domainName: string
}

export class DnsStack extends Stack {
  public readonly hostedZone: HostedZone;
  public readonly certificate: Certificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id);

    const { domainName } = props;

    // DNS検証付きACM証明書の作成
    this.certificate = new Certificate(this, "Certificate", {
      domainName: domainName,
      validation: CertificateValidation.fromDns(this.hostedZone),
    });

    // 証明書のARNを出力
    new CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
      exportName: `${props.resourceName}-certificate-arn`,
    });
  }
}
