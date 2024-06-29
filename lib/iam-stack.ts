import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  User,
  Policy,
  PolicyStatement,
  Effect,
  CfnAccessKey,
} from "aws-cdk-lib/aws-iam";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

interface IamStackProps extends StackProps {
  readonly resourceName: string;
  readonly cognitoUserPoolArn: string;
  readonly s3BucketArn: string;
}

export class IamStack extends Stack {
  constructor(scope: Construct, id: string, props: IamStackProps) {
    super(scope, id, props);

    const { resourceName, cognitoUserPoolArn, s3BucketArn } = props;

    // IAM User for API
    const apiUser = new User(this, `${resourceName}-api-user`, {
      userName: `${resourceName}-api-user`,
    });

    // Cognito Policy
    const cognitoPolicy = new Policy(this, `${resourceName}-cognito-policy`, {
      policyName: `${resourceName}-cognito-policy-for-api`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["cognito-idp:AdminSetUserPassword"],
          resources: [cognitoUserPoolArn],
        }),
      ],
    });

    // S3 Policy
    const s3Policy = new Policy(this, `${resourceName}-s3-policy`, {
      policyName: `${resourceName}-s3-policy-for-api`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"],
          resources: [`${s3BucketArn}/*`],
        }),
      ],
    });

    // Attach policies to the user
    apiUser.attachInlinePolicy(cognitoPolicy);
    apiUser.attachInlinePolicy(s3Policy);

    // Generate access key and secret key
    const accessKey = new CfnAccessKey(this, `${resourceName}-access-key`, {
      userName: apiUser.userName,
    });

    // Store access key and secret key in Secrets Manager
    new Secret(this, `${resourceName}-api-secret`, {
      secretName: `/${resourceName}/api/aws/credentials/`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          accessKeyId: accessKey.ref,
        }),
        generateStringKey: "secretAccessKey",
        excludePunctuation: true,
        includeSpace: false,
      },
    });
  }
}
