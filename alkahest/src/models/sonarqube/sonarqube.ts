import fs from "fs";
import path from "path";
import axios from "axios";
import * as vscode from "vscode";

import { window, workspace, ProgressLocation } from "vscode";
import { isPackageInstalled, installPackage } from "./sonarqube-install";

const defaultEncoding = "UTF-8";
const defaultDesc = "Project scanned by Alkahest on ";
const decorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 0, 0, 0.3)'
});

export default class SonarQube {
  private projectKey: any; // Unique key to the project
  private organization: any; // Unique organization of the user
  private projectEncoding: any; // Encoding of the project
  private SonarCloudToken: any; // The SonarCloud authentication token
  private projectDescription?: any; // Description of the project
  private apiCallOptions: any; // Options for the API calls

  constructor(projectDescription?: string, projectEncoding?: string) {
    if (!isPackageInstalled()) {
      // TODO: installPackage() function needs to be enhanced
      // Right now, it is not asynchronous and does not return a promise
      // This makes it difficult to handle the installation process
      // The function should return a promise and should be awaited
      if (!installPackage()) {
        window.showErrorMessage(
          "SonarQube Scanner is not installed. Please install it manually before scanning."
        );

        throw new Error("SonarQube Scanner installation failed");
      }
    }

    const now = new Date().toISOString().replace(/:/g, "-");

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

          await this.createPropertiesFile(proPath);

          const { spawn } = require("child_process");
          const childProcess = spawn(command, [], options);

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
      this.apiCallOptions
    );

    return {
      measures: response.data.component.measures,
      metrics: response.data.metrics,
    };
  }

  public async getDuplications(branchKey?: string, fileKey?: string): Promise<any> {
    try {
        let url = 'https://sonarcloud.io/web_api/api/duplications/show?deprecated=false&section=params';

        // Append branchKey and fileKey to URL if provided
        if (branchKey && fileKey) {
            url += `?branchKey=${branchKey}&fileKey=${fileKey}`;
        }

        // Fetch duplications from the SonarQube API
        const response = await axios.get(url, this.apiCallOptions);

        return response.data;
    } catch (error) {
        // Log detailed information about the error
        console.error("Error fetching duplications:", error);

        // Throw a custom error message to handle the 404 error
        if ((error as any).response && (error as any).response.status === 404) {
            throw new Error("Duplications not found for the project or branch.");
        } else {
            // Throw the original error if it's not a 404 error
            throw error;
        }
    }
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
