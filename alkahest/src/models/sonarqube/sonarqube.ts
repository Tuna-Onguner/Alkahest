import { window, workspace } from "vscode";

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
    return new Promise<any>((resolve, reject) => {
      const wsfs = workspace.workspaceFolders;
      if (!wsfs) {
        window.showErrorMessage("Please open a project before scanning");
        reject(new Error("No open projects"));
      } else {
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
        spawn(command, args, options)
          .on("exit", async (code: number) => {
            if (code === 0) {
              window.showInformationMessage("Scanning completed successfully");

              const axios = require("axios");
              const response = await axios.get(
                `https://sonarcloud.io/api/measures/component?component=${this.projectKey}
                &metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density`
              );

              resolve(response.data);
            } else {
              window.showErrorMessage("Scanning failed");
              reject(new Error(`Process exited with code: ${code}`));
            }
          })
          .on("error", (error: any) => {
            reject(error);
          });
      }
    });
  }
}
