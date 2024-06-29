import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  UserPool,
  UserPoolClient,
  AccountRecovery,
} from "aws-cdk-lib/aws-cognito";
import { DOMAIN_NAME } from "../config/const";

interface CognitoStackProps extends StackProps {
  readonly resourceName: string;
}

export class CognitoStack extends Stack {
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly userPoolArn: string;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const { resourceName } = props;

    // Create a Cognito User Pool
    const userPool = new UserPool(this, "ManageUser", {
      userPoolName: "manage-user",
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: false,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      userInvitation: {
        emailSubject: "【NPHD-SAP】ユーザー登録が完了しました",
        emailBody: `ユーザー登録が完了しました。<br />ユーザー名: {username} <br />パスワード: {####} <br /><br />以下のリンクからサインインしてください。<br />https://${DOMAIN_NAME}/manage`,
      },
    });

    this.userPoolId = userPool.userPoolId;

    // Create a User Pool Client
    const userPoolClient = new UserPoolClient(this, "CognitoClient", {
      userPool,
      userPoolClientName: "cognito-client",
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    this.userPoolClientId = userPoolClient.userPoolClientId;

    this.userPoolArn = userPool.userPoolArn;
  }
}
