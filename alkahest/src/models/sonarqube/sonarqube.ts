import fs from "fs";
import path from "path";
import axios from "axios";

import { execSync } from "child_process";
import { window, workspace, ProgressLocation } from "vscode";

const packageName = "sonarqube-scanner";

const defaultEncoding = "UTF-8";
const defaultDesc = "Project scanned by Alkahest on ";

export default class SonarQube {
  private projectKey: any; // Unique key to the project
  private organization: any; // Unique organization of the user
  private isScannedOnce: any; // Check if the project is scanned before
  private apiCallOptions: any; // Options for the API calls
  private projectEncoding: any; // Encoding of the project
  private SonarCloudToken: any; // The SonarCloud authentication token
  private projectDescription?: any; // Description of the project

  private static isPackageInstalled(): boolean {
    try {
      execSync(`npm list -g ${packageName}`, { stdio: "inherit" });
      return true;
    } catch (error) {
      return false;
    }
  }

  private static installPackage(): boolean {
    try {
      execSync(`npm install -g ${packageName}`, { stdio: "inherit" });
      return true;
    } catch (error) {
      return false;
    }
  }

  constructor(projectDescription?: string, projectEncoding?: string) {
    if (!SonarQube.isPackageInstalled()) {
      if (!SonarQube.installPackage()) {
        window.showErrorMessage(
          "SonarQube Scanner is not installed. Please install it manually before scanning."
        );

        throw new Error("SonarQube Scanner installation failed");
      }
    }

    const now = new Date().toISOString().replace(/:/g, "-");

    this.isScannedOnce = this.isScannedBefore();
    this.SonarCloudToken = process.env.SONARCLOUD_TOKEN;
    this.organization = process.env.SONARCLOUD_ORGANIZATION;
    this.projectEncoding = projectEncoding ?? defaultEncoding;
    this.projectDescription = projectDescription ?? defaultDesc.concat(now);

    this.projectKey = (workspace.workspaceFolders?.[0].name ?? "project")
      .replace(/ /g, "_")
      .toLowerCase()
      .concat(":", now);

    this.apiCallOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.SonarCloudToken}`,
      },
    };
  }

  private async isPropertiesFilePresent(): Promise<boolean> {
    const rootPath = workspace.workspaceFolders?.[0].uri.fsPath;

    if (!rootPath) {
      return false;
    }

    const files = fs.readdirSync(rootPath);
    return files.some((file) => file === "sonar-project.properties");
  }

  private async getProjectKey(): Promise<string | undefined> {
    if (await this.isPropertiesFilePresent()) {
      const rootPath = workspace.workspaceFolders?.[0].uri.fsPath;

      if (!rootPath) {
        return undefined;
      }

      const propertiesFile = fs.readFileSync(
        path.join(rootPath!, "sonar-project.properties"),
        "utf-8"
      );

      const projectKey = propertiesFile
        .split("\n")
        .find((line) => line.startsWith("sonar.projectKey"));

      return projectKey?.split("=")[1].trim() ?? undefined;
    }

    return undefined;
  }

  public async isScannedBefore(): Promise<boolean> {
    const projectKey = await this.getProjectKey();

    if (!projectKey) {
      return false;
    }

    const response = await axios.get(
      `https://sonarcloud.io/api/projects/search?organization=${this.organization}&q=${projectKey}`,
      this.apiCallOptions
    );

    return response.data.components.length > 0;
  }

  private async createPropertiesFile(proPath: string): Promise<void> {
    const propertiesFileContent = [
      `sonar.host.url=https://sonarcloud.io/`,
      `sonar.token=${this.SonarCloudToken}`,
      `sonar.organization=${this.organization}`,
      `sonar.projectKey=${this.projectKey}`,
      `sonar.projectName=${this.projectKey.split(":")[0]}`,
      `sonar.projectDescription=${this.projectDescription}`,
      `sonar.sourceEncoding=${this.projectEncoding}`,
      `sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/test/**,**/tests/**,**/tmp/**,**/temp,.vscode/**,**/.vscode/**,**/.github/**,**/.git/**,**/.gitignore,**/.gitattributes,**/.gitmodules,**/.gitkeep`,
    ];

    fs.writeFileSync(
      path.join(proPath, "sonar-project.properties"),
      propertiesFileContent.join("\n")
    );
  }

  public async scan(): Promise<any> {
    if (this.isScannedOnce) {
      const confirmRescan = async () => {
        const userResponse = await window.showInformationMessage(
          "Your project is already scanned once. Would you like to re-scan?",
          { modal: true },
          "Yes",
          "No"
        );

        return userResponse === "Yes";
      };

      if (!(await confirmRescan())) {
        return;
      }
    }

    return window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Scanning your project",
        cancellable: true,
      },
      async (progress, token) => {
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
          const msPerMB = 1220;

          const options = { cwd: proPath, stdio: "inherit" };
          const command = "sonar-scanner";

          if (!(await this.isPropertiesFilePresent())) {
            await this.createPropertiesFile(proPath);
          }

          const { spawn } = require("child_process");
          const childProcess = spawn(command, [], options);

          // Track cancellation event
          token.onCancellationRequested(() => {
            if (childProcess && !childProcess.killed) {
              childProcess.kill(); // Kill the child process on cancellation
            }
            clearInterval(progressInterval);
            window.showWarningMessage("Scanning canceled by user");
          });

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
      `https://sonarcloud.io/api/measures/component?component=${await this.getProjectKey()}
      &metricKeys=lines,bugs,code_smells,vulnerabilities,duplicated_lines_density,ncloc,cognitive_complexity
      &additionalFields=metrics`,
      this.apiCallOptions
    );

    return {
      measures: response.data.component.measures,
      metrics: response.data.metrics,
    };
  }

  public async getDuplications(): Promise<any> {
    // To get the duplications, the project key is used
    const response = await axios.get(
      `https://sonarcloud.io/api/measures/component_tree?component=${await this.getProjectKey()}
      &metricKeys=duplicated_blocks`,
      this.apiCallOptions
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
        this.apiCallOptions
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
