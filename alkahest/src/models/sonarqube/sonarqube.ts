import fs from "fs";
import path from "path";

import { window, workspace, ProgressLocation } from "vscode";
import { isPackageInstalled, installPackage } from "./sonarqube-install";

const defaultProjectEncoding = "UTF-8";
const axios = require("axios");

export default class SonarQube {
  private projectKey: any; // Unique key to the project
  private organization: any; // Unique organization of the user
  private projectEncoding: any; // Encoding of the project
  private SonarCloudToken: any; // The SonarCloud authentication token
  private projectDescription?: any; // Description of the project
  private options: any; // Options for the API calls

  constructor(projectDescription?: string, projectEncoding?: string) {
    if (!isPackageInstalled()) {
      if (!installPackage()) {
        window.showErrorMessage(
          "SonarQube Scanner is not installed. Please install it manually before scanning."
        );
        throw new Error("SonarQube Scanner installation failed");
      }
    }

    this.SonarCloudToken = process.env.SONARCLOUD_TOKEN;
    this.organization = process.env.SONARCLOUD_ORGANIZATION;
    this.projectEncoding = projectEncoding ?? defaultProjectEncoding;
    this.projectDescription = projectDescription;

    this.projectKey = workspace.workspaceFolders?.[0].name
      .replace(/ /g, "_")
      .toLowerCase();

    this.options = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.SonarCloudToken}`,
      },
    };
  }

  private createPropertiesFile(): void {
    const wsfs = workspace.workspaceFolders;
    if (!wsfs) {
      window.showErrorMessage("Please open a project before scanning");
      throw new Error("No open projects");
    }

    const proPath = wsfs[0].uri.fsPath;
    const propertiesFilePath = path.join(proPath, "sonar-project.properties");

    let propertiesFileContent = `
      sonar.host.url=https://sonarcloud.io/
      sonar.token=${this.SonarCloudToken}
      sonar.organization=${this.organization}
      sonar.projectKey=${this.projectKey}
      sonar.projectName=${this.projectKey.toUpperCase()}
      sonar.sources=${proPath}
      sonar.sourceEncoding=${this.projectEncoding}
      sonar.exclusions=node_modules/**,dist/**,build/**,out/**,target/**,.vscode/**,.git/**,.idea/**,
        .DS_Store,.gitignore,.gitattributes,.editorconfig,.eslintrc.js,.prettierrc.js,.prettierignore,
        .vscodeignore,.vscode/settings.json,.vscode/launch.json,.vscode/tasks.json,.vscode/extensions.json,
        .vscode/keybindings.json,.vscode/snippets/**,.vscode/remote-containers/**,.vscode/remote-data/**,
        .vscode/remote-ssh/**,.vscode/remote-sync/**,.vscode/remote-wsl/**,.vscode-server/**,.vscode-test/**,
        .vscode-webview/**,.vscode-workspace/**,.vscode-server-insiders/**,.vscode-server-insiders-test/**,
        .vscode-server-oss/**,.vscode-server-oss-test/**,.vscode-server-test/**,.vscode-server-remote/**,
        .vscode-server-remote-test/**,.vscode-server-remote-insiders/**,
        .vscode-server-remote-insiders-test/**,.vscode-server-remote-oss/**,
        .vscode-server-remote-oss-test/**,.vscode-server-remote-oss-insiders
    `;

    if (this.projectDescription) {
      propertiesFileContent += `\nsonar.projectDescription=${this.projectDescription}`;
    }

    fs.writeFileSync(propertiesFilePath, propertiesFileContent);
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
        progress.report({ increment: progressValue });

        try {
          const wsfs = workspace.workspaceFolders;
          if (!wsfs) {
            window.showErrorMessage("Please open a project before scanning");
            throw new Error("No open projects");
          }

          const proPath = wsfs[0].uri.fsPath;
          const proSize = SonarQube.getDirectorySize(proPath); // in MB
          const msPerMB = 1000;

          const options = { cwd: proPath, stdio: "inherit" };
          const command = "sonar-scanner";

          this.createPropertiesFile();

          const { spawn } = require("child_process");
          const childProcess = spawn(command, options);

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
    const response = await axios.get(
      // The necessary metrics are hardcoded in the URL
      // They can be changed according to the requirements if needed
      `https://sonarcloud.io/api/measures/component?component=${this.projectKey}
      &metricKeys=bugs,code_smells,vulnerabilities,duplicated_lines_density,ncloc,cognitive_complexity
      &additionalFields=metrics`,
      this.options
    );

    return {
      measures: response.data.component.measures,
      metrics: response.data.metrics,
    };
  }

  public async getDuplications(): Promise<any> {
    // To get the duplications, the project key is used
    const response = await axios.get(
      `https://sonarcloud.io/api/measures/component_tree?component=${this.projectKey}
      &metricKeys=duplicated_blocks`,
      this.options
    );

    return response.data;
  }

  public async logout(): Promise<any> {
    // SonarCloud does not logout explicitly
    // Use this function to logout from the SonarCloud API
    // Called from the function deactivate in the extension.ts file
    try {
      await axios.post(
        `https://sonarcloud.io/api/authentication/logout`,
        {},
        this.options
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
