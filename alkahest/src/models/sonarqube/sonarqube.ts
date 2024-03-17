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
          const msPerMB = 1000; // approximately 810ms per MB

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
            `-Dsonar.exclusions=node_modules/**,dist/**,build/**,out/**,target/**,.vscode/**,.git/**,.idea/**,
              .DS_Store,.gitignore,.gitattributes,.editorconfig,.eslintrc.js,.prettierrc.js,.prettierignore,
              .vscodeignore,.vscode/settings.json,.vscode/launch.json,.vscode/tasks.json,.vscode/extensions.json,
              .vscode/keybindings.json,.vscode/snippets/**,.vscode/remote-containers/**,.vscode/remote-data/**,
              .vscode/remote-ssh/**,.vscode/remote-sync/**,.vscode/remote-wsl/**,.vscode-server/**,.vscode-test/**,
              .vscode-webview/**,.vscode-workspace/**,.vscode-server-insiders/**,.vscode-server-insiders-test/**,
              .vscode-server-oss/**,.vscode-server-oss-test/**,.vscode-server-test/**,.vscode-server-remote/**,
              .vscode-server-remote-test/**,.vscode-server-remote-insiders/**,
              .vscode-server-remote-insiders-test/**,.vscode-server-remote-oss/**,
              .vscode-server-remote-oss-test/**,.vscode-server-remote-oss-insiders`,
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
            progress.report({ increment: 100 - progressValue });
            window.showInformationMessage("Scanning completed");

            return;
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

  public async getMeasures(): Promise<any> {
    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.SCToken}`,
      },
    };

    const axios = require("axios");
    const response = await axios.get(
      // The necessary metrics are hardcoded in the URL
      // They can be changed according to the requirements if needed
      `https://sonarcloud.io/api/measures/component?component=${this.projectKey}
      &metricKeys=bugs,code_smells,vulnerabilities,duplicated_lines_density,ncloc,cognitive_complexity
      &additionalFields=metrics`,
      options
    );

    return {
      measures: response.data.component.measures,
      metrics: response.data.metrics,
    };
  }

  public async getMetrics(): Promise<any> {
    // This function is not likely to be used in the extension
    // However, it is included for the sake of completeness and
    // the possibility of future use due to changing domain requirements
    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.SCToken}`,
      },
    };

    const axios = require("axios");
    const response = await axios.get(
      `https://sonarcloud.io/api/metrics/search?f=name,description&ps=500`,
      options
    );

    return response.data.metrics;
  }

  public async getDuplications(): Promise<any> {
    // To get the duplications, the project key is used
    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.SCToken}`,
      },
    };

    const axios = require("axios");
    const response = await axios.get(
      `https://sonarcloud.io/api/measures/component_tree?component=${this.projectKey}
      &metricKeys=duplicated_blocks`,
      options
    );

    return response.data;
  }

  public async logout(): Promise<any> {
    // SonarCloud does not logout explicitly
    // Use this function to logout from the SonarCloud API
    // Called from the function deactivate in the extension.ts file
    const options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.SCToken}`,
      },
    };

    const axios = require("axios");

    try {
      await axios.post(
        `https://sonarcloud.io/api/authentication/logout`,
        {},
        options
      );
    } catch (error: any) {
      console.error(error.message);
    }
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
