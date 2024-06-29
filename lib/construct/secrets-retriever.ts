import { Construct } from "constructs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export class SecretRetriever extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  public getSecretValue(
    secretKeys: readonly string[],
    arn: string
  ): { [key: string]: string } {
    const secret = Secret.fromSecretAttributes(this, `SecretStrings-${arn}`, {
      secretCompleteArn: arn,
    });

    return secretKeys.reduce(
      (acc, key) => {
        const secretValue = secret.secretValueFromJson(key).unsafeUnwrap();
        if (!secretValue) {
          throw new Error(`Failed to get ${key}`);
        }

        acc[key] = secretValue;
        return acc;
      },
      {} as { [key: string]: string }
    );
  }
}
