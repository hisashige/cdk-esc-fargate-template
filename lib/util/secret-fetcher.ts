import { Construct } from "constructs";
import { SecretRetriever } from "../construct/secrets-retriever";

export interface Secrets {
  databaseUrl: string;
  apiAwsSecretValues: { accessKeyId: string; secretAccessKey: string };
  lineSecretValues: {
    LINE_CHANNEL_ACCESS_TOKEN: string;
    LINE_CHANNEL_SECRET: string;
    BEFORE_USER_REGISTRATION_RICHMENU_ID: string;
    AFTER_USER_REGISTRATION_RICHMENU_ID: string;
  };
}

export function getSecrets(
  scope: Construct,
): Secrets {

  // 環境変数のARNの存在確認
  const rdsSecretManagerArn = process.env.RDS_SECRET_MANAGER_ARN;
  const apiAwsSecretManagerArn = process.env.API_AWS_SECRET_MANAGER_ARN;
  const lineSecretManagerArn = process.env.LINE_SECRET_MANAGER_ARN;
  if (!rdsSecretManagerArn) {
    throw new Error("Failed to get RDS_SECRET_MANAGER_ARN");
  }
  if (!apiAwsSecretManagerArn) {
    throw new Error("Failed to get API_AWS_SECRET_MANAGER_ARN");
  }
  if (!lineSecretManagerArn) {
    throw new Error("Failed to get LINE_SECRET_MANAGER_ARN");
  }

  const secretRetriever = new SecretRetriever(scope, "SecretRetriever");

  // RDSシークレットの取得
  const rdsKeys = ["username", "password", "host", "port", "dbname"] as const;
  const { username, password, host, port, dbname } =
    secretRetriever.getSecretValue(rdsKeys, rdsSecretManagerArn);
  const databaseUrl = `mysql://${username}:${password}@${host}:${port}/${dbname}`;

  // API用IAMユーザーのシークレットの取得
  const apiAwsKeys = ["accessKeyId", "secretAccessKey"] as const;
  const apiAwsSecretValues = secretRetriever.getSecretValue(
    apiAwsKeys,
    apiAwsSecretManagerArn
  );

  // LINE関連シークレットの取得
  const lineKeys = [
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_CHANNEL_SECRET",
    "BEFORE_USER_REGISTRATION_RICHMENU_ID",
    "AFTER_USER_REGISTRATION_RICHMENU_ID",
  ] as const;
  const lineSecretValues = secretRetriever.getSecretValue(
    lineKeys,
    lineSecretManagerArn
  );

  return {
    databaseUrl,
    apiAwsSecretValues: {
      accessKeyId: apiAwsSecretValues.accessKeyId,
      secretAccessKey: apiAwsSecretValues.secretAccessKey,
    },
    lineSecretValues: {
      LINE_CHANNEL_ACCESS_TOKEN: lineSecretValues.LINE_CHANNEL_ACCESS_TOKEN,
      LINE_CHANNEL_SECRET: lineSecretValues.LINE_CHANNEL_SECRET,
      BEFORE_USER_REGISTRATION_RICHMENU_ID:
        lineSecretValues.BEFORE_USER_REGISTRATION_RICHMENU_ID,
      AFTER_USER_REGISTRATION_RICHMENU_ID:
        lineSecretValues.AFTER_USER_REGISTRATION_RICHMENU_ID,
    },
  };
}
