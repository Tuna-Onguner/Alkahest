import { window, workspace, ProgressLocation } from "vscode";

export default class SonarQube {
  private SCToken: any; // The SonarCloud authentication token
  private projectKey: any; // Unique key to the project
  private organization: any; // Unique organization of the user

  constructor(projectKey?: string) {
    this.SCToken = process.env.SONARCLOUD_TOKEN;
    this.organization = process.env.SONARCLOUD_ORGANIZATION;
    this.projectKey = projectKey ?? `project:${new Date().getTime()}`;
  }

  async scan(): Promise<any> {
    return window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Scanning the project...",
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

          const options = { cwd: proPath, stdio: "inherit" };
          const command = "sonar-scanner";
          const args = [
            `-Dsonar.host.url=https://sonarcloud.io/`,
            `-Dsonar.token=${this.SCToken}`,
            `-Dsonar.organization=${this.organization}`,
            `-Dsonar.projectKey=${this.projectKey}`,
            `-Dsonar.projectName=${wsfs[0].name
              .replace(/ /g, "_")
              .toUpperCase()}`,
            `-Dsonar.sources=${proPath}`,
          ];

          const { spawn } = require("child_process");
          const childProcess = spawn(command, args, options);

          const progressInterval = setInterval(() => {
            if (progressValue < 90) {
              progressValue += 2;
              progress.report({ increment: 2 });
            }
          }, 1550);

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

            await new Promise((resolve) => setTimeout(resolve, 900));
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
}
