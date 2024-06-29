import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Repository } from "aws-cdk-lib/aws-ecr";

interface EcrStackProps extends StackProps {
  readonly resourceName: string;
}

export class EcrStack extends Stack {
  public readonly apiRepository: Repository;
  public readonly liffRepository: Repository;
  public readonly manageRepository: Repository;
  public readonly migrationRepository: Repository;

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    this.apiRepository = new Repository(this, "ApiRepository", {
      repositoryName: `${props.resourceName}-api-repository`,
    });

    this.liffRepository = new Repository(this, "LiffRepository", {
      repositoryName: `${props.resourceName}-liff-repository`,
    });

    this.manageRepository = new Repository(this, "ManageRepository", {
      repositoryName: `${props.resourceName}-manage-repository`,
    });

    this.migrationRepository = new Repository(this, "MigrationRepository", {
      repositoryName: `${props.resourceName}-migration-repository`,
    });
  }
}
