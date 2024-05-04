import fs from "fs";
import path from "path";
import axios from "axios";

import { execSync } from "child_process";
import * as vscode from "vscode";

export default class SonarQube {
  private static _packageName = "sonarqube-scanner";
  private static _defaultEncoding = "UTF-8";
  private static _defaultDesc = "Project scanned by Alkahest on ";

  private projectKey: any; // Unique key to the project
  private projectEncoding: string; // Encoding of the project
  private projectDescription?: string; // Description of the project

  private organization: any; // Unique organization of the user
  private SonarCloudToken: any; // The SonarCloud authentication token

  private filesChanged: boolean;
  private apiCallOptions: any; // Options for the API calls

  private static _isPackageInstalled(): boolean {
    try {
      execSync(`npm list -g ${SonarQube._packageName}`, { stdio: "inherit" });
      return true;
    } catch (error) {
      return false;
    }
  }

  private static _installPackage(): boolean {
    try {
      execSync(`npm install -g ${SonarQube._packageName}`, {
        stdio: "inherit",
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  constructor(projectDescription?: string, projectEncoding?: string) {
    if (!SonarQube._isPackageInstalled()) {
      if (!SonarQube._installPackage()) {
        vscode.window.showErrorMessage(
          "SonarQube Scanner is not installed. " +
            "Please install it manually before scanning."
        );

        throw new Error("SonarQube Scanner installation failed");
      }
    }

    const now = new Date().toISOString().replace(/:/g, "-");

    this.projectKey =
      this.getProjectKey() ??
      (vscode.workspace.workspaceFolders?.[0].name ?? "project")
        .replace(/ /g, "_")
        .toLowerCase()
        .concat(":", now);
    this.projectEncoding = projectEncoding ?? SonarQube._defaultEncoding;
    this.projectDescription =
      projectDescription ?? SonarQube._defaultDesc.concat(now);

    this.organization = process.env.SONARCLOUD_ORGANIZATION;
    this.SonarCloudToken = process.env.SONARCLOUD_TOKEN;

    this.filesChanged = false;
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.filesChanged = true;
    });

    this.apiCallOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.SonarCloudToken}`,
      },
    };
  }

  private async isPropertiesFilePresent(): Promise<boolean> {
    const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

    if (!rootPath) {
      return false;
    }

    const files = fs.readdirSync(rootPath);
    return files.some((file) => file === "sonar-project.properties");
  }

  private async getProjectKey(): Promise<string | undefined> {
    if (await this.isPropertiesFilePresent()) {
      const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

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
    function titleCase(str: string): string {
      return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    const propertiesFileContent = [
      `sonar.host.url=https://sonarcloud.io/`,
      `sonar.token=${this.SonarCloudToken}`,
      `sonar.organization=${this.organization}`,
      `sonar.projectKey=${this.projectKey}`,
      `sonar.projectName=${titleCase(this.projectKey.split(":")[0])}`,
      `sonar.projectDescription=${this.projectDescription}`,
      `sonar.sourceEncoding=${this.projectEncoding}`,
      `sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/test/**,**/tests/**,**/tmp/**,` +
        `**/temp,.vscode/**,**/.vscode/**,**/.github/**,**/.git/**,**/.gitignore,**/.gitattributes,**/.gitmodules,**/.gitkeep`,
    ];

    fs.writeFileSync(
      path.join(proPath, "sonar-project.properties"),
      propertiesFileContent.join("\n")
    );
  }

  public async scan(status: { success: boolean }): Promise<any> {
    if (!this.filesChanged && (await this.isScannedBefore())) {
      const confirmRescan = async () => {
        const userResponse = await vscode.window.showInformationMessage(
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

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Scanning your project",
        cancellable: true,
      },
      async (progress, token) => {
        let progressValue = 0;
        progress.report({ increment: progressValue });

        try {
          const wsfs = vscode.workspace.workspaceFolders;
          if (!wsfs) {
            vscode.window.showErrorMessage(
              "Please open a project before scanning"
            );

            return;
          }

          const proPath = wsfs[0].uri.fsPath;
          const proSize = SonarQube._getDirectorySize(proPath); // in MB
          const msPerMB = 1125;

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
          });

          const progressInterval = setInterval(() => {
            if (progressValue < 90) {
              progressValue += 2;
              progress.report({ increment: 2 });
            }
          }, (proSize * msPerMB) / 45); // 45 := number of loop iterations

          const exitCode = await new Promise<number | null>((resolve) => {
            childProcess.on("exit", (code: number | null) => {
              clearInterval(progressInterval);
              resolve(code);
            });
          });

          if (exitCode === 0) {
            progress.report({ increment: 100 - progressValue });
            vscode.window.showInformationMessage("Scanning completed");
            status.success = true;
          } else if (exitCode === null) {
            clearInterval(progressInterval);
            vscode.window.showWarningMessage("Scanning canceled by user");
            status.success = false;
          } else {
            clearInterval(progressInterval);
            vscode.window.showErrorMessage("Scanning failed");
            status.success = false;
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

  private static _getDirectorySize(directoryPath: string): number {
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
