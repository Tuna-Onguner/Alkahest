import fs from "fs";
import path from "path";
import { window, workspace, ProgressLocation } from "vscode";

export default class SonarQube {
  private SCToken: any; // The SonarCloud authentication token
  private projectKey: any; // Unique key to the project
  private organization: any; // Unique organization of the user
  private projectEncoding: any; // Encoding of the project
  private projectDescription?: any; // Description of the project

  constructor(projectDescription?: string, projectEncoding?: string) {
    this.SCToken = process.env.SONARCLOUD_TOKEN;
    this.organization = process.env.SONARCLOUD_ORGANIZATION;
    this.projectKey =
      workspace.workspaceFolders?.[0].name.replace(/ /g, "_").toLowerCase() ??
      `project:${new Date().getTime()}`;
    this.projectEncoding = projectEncoding ?? "UTF-8";
    this.projectDescription = projectDescription;
  }

  public async scan(): Promise<any> {
    return window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Scanning your project",
        cancellable: false,
      },
      async (progress) => {
        let progressValue = 0;
        progress.report({ increment: 0 });

        try {
          const wsfs = workspace.workspaceFolders;
          if (!wsfs) {
            window.showErrorMessage("Please open a project before scanning");
            throw new Error("No open projects");
          }

          const proPath = wsfs[0].uri.fsPath;
          const proSize = SonarQube.getDirectorySize(proPath); // in MB
          const msPerMB = 810; // approximately 810ms per MB

          const options = { cwd: proPath, stdio: "inherit" };
          const command = "sonar-scanner";
          let args = [
            `-Dsonar.host.url=https://sonarcloud.io/`,
            `-Dsonar.token=${this.SCToken}`,
            `-Dsonar.organization=${this.organization}`,
            `-Dsonar.projectKey=${this.projectKey}`,
            `-Dsonar.projectName=${this.projectKey.toUpperCase()}`,
            `-Dsonar.sources=${proPath}`,
            `-Dsonar.sourceEncoding=${this.projectEncoding}`,
            `-Dsonar.exclusions=node_modules/**,dist/**,build/**,out/**,target/**,.vscode/**,.git/**,.idea/**,*.json,*.yml,*.yaml,*.md,*.xml,*.html,*.css,*.scss,*.less,*.js,*.jsx,*.ts,*.tsx,*.php,*.py,*.java,*.c,*.cpp,*.h,*.hpp,*.cs,*.vb,*.fs,*.fsx,*.fsi,*.swift,*.kt,*.kts,*.groovy,*.gradle,*.rb,*.rake,*.gemspec,*.pl,*.pm,*.t,*.pod,*.php,*.php3,*.php4,*.php5,*.php7,*.phtml,*.phpt,*.phpunit,*.phpcs,*.phpcbf,*.phpdoc,*.phpini,*.phps,*.phpsa,*.phpspec,*.phpsr,*.phpmd,*.phpunit,*.phpunit.xml,*.phpunit.xml.dist,*.phpunit.xml.dist.dist,*.phpunit.xml.dist.dist.dist,*.phpunit.xml.dist.dist.dist.dist,*.phpunit.xml.dist.dist.dist.dist.dist,*.phpunit.xml.dist.dist.dist.dist.dist.dist,*.phpunit.xml.dist.dist.dist.dist.dist.dist.dist,*.phpunit.xml.dist.dist.dist.dist.dist.dist.dist.dist,*.phpunit.xml.dist.dist.dist.dist.dist.dist.dist.dist.dist,*.phpunit.xml`,
          ];

          if (this.projectDescription) {
            args.push(`-Dsonar.projectDescription=${this.projectDescription}`);
          }

          const { spawn } = require("child_process");
          const childProcess = spawn(command, args, options);

          const progressInterval = setInterval(() => {
            if (progressValue < 90) {
              progressValue += 2;
              progress.report({ increment: 2 });
            }
          }, (proSize * msPerMB) / 45); // 45 := number of loop iterations

          const exitCode = await new Promise<number>((resolve) => {
            childProcess.on("exit", (code: number) => {
              clearInterval(progressInterval);
              resolve(code);
            });
          });

          if (exitCode === 0) {
            const axios = require("axios");
            const response = await axios.get(
              `https://sonarcloud.io/api/measures/component?component=${this.projectKey}&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density`
            );

            progress.report({
              message: "Scanning completed successfully",
              increment: 9,
            });

            await new Promise((resolve) => setTimeout(resolve, 2000));
            progress.report({ increment: 1 });

            return response.data;
          } else {
            window.showErrorMessage("Scanning failed");
            throw new Error(`Process exited with code: ${exitCode}`);
          }
        } catch (error: any) {
          console.error(error.message);
          throw error;
        }
      }
    );
  }

  private static getDirectorySize(directoryPath: string): number {
    let sizeInBytes = 0;

    const calculateSize = (filePath: string) => {
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        fs.readdirSync(filePath).forEach((file) => {
          calculateSize(path.join(filePath, file));
        });
      } else {
        sizeInBytes += stats.size;
      }
    };

    calculateSize(directoryPath);

    const sizeInMegabytes = sizeInBytes / (1024 * 1024);

    return sizeInMegabytes;
  }
}
