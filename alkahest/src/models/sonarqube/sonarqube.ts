import fs from "fs";
import path from "path";
import axios from "axios";
import * as vscode from "vscode";

import { execSync } from "child_process";
interface File {
  key: string;
  name: string;
  projectName: string;
}

export default class SonarQube {
  private static readonly _packageName = "sonarqube-scanner";
  private static readonly _defaultEncoding = "UTF-8";
  private static readonly _defaultDesc = "Project scanned by Alkahest on ";

  private readonly _now: string = new Date().toISOString().replace(/:/g, "-");

  private _projectKey: any; // Unique key to the project
  private _projectEncoding: string; // Encoding of the project
  private _projectDescription?: string; // Description of the project

  private _organization: any; // Unique organization of the user
  private _sonarCloudToken: any; // The SonarCloud authentication token

  private _filesChanged: boolean;
  private _apiCallOptions: any; // Options for the API calls

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

    this._projectEncoding = projectEncoding ?? SonarQube._defaultEncoding;
    this._projectDescription =
      projectDescription ?? SonarQube._defaultDesc.concat(this._now);

    this._organization = process.env.SONARCLOUD_ORGANIZATION;
    this._sonarCloudToken = process.env.SONARCLOUD_TOKEN;

    this._filesChanged = false;
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this._filesChanged = true;
    });

    this._apiCallOptions = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this._sonarCloudToken}`,
      },
    };
  }

  public async initializeKey(): Promise<void> {
    this._projectKey =
      (await this._getProjectKey()) ??
      (vscode.workspace.workspaceFolders?.[0].name ?? "project")
        .replace(/ /g, "_")
        .toLowerCase()
        .concat(":", this._now);
  }

  private async _isPropertiesFilePresent(): Promise<boolean> {
    const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

    if (!rootPath) {
      return false;
    }

    const files = fs.readdirSync(rootPath);
    return files.some((file) => file === "sonar-project.properties");
  }

  private async _getProjectKey(): Promise<string | undefined> {
    if (await this._isPropertiesFilePresent()) {
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

  private async _isScannedBefore(): Promise<boolean> {
    const projectKey = await this._getProjectKey();

    if (!projectKey) {
      return false;
    }

    const response = await axios.get(
      `https://sonarcloud.io/api/projects/search?organization=${this._organization}&q=${projectKey}`,
      this._apiCallOptions
    );

    return response.data.components.length > 0;
  }

  private async _createPropertiesFile(proPath: string): Promise<void> {
    function titleCase(str: string): string {
      return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    const propertiesFileContent = [
      `sonar.host.url=https://sonarcloud.io/`,
      `sonar.token=${this._sonarCloudToken}`,
      `sonar.organization=${this._organization}`,
      `sonar.projectKey=${this._projectKey}`,
      `sonar.projectName=${titleCase(this._projectKey.split(":")[0])}`,
      `sonar.projectDescription=${this._projectDescription}`,
      `sonar.sourceEncoding=${this._projectEncoding}`,
      `sonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/test/**,**/tests/**,**/tmp/**,` +
        `**/temp,.vscode/**,**/.vscode/**,**/.github/**,**/.git/**,**/.gitignore,**/.gitattributes,**/.gitmodules,**/.gitkeep`,
    ];

    fs.writeFileSync(
      path.join(proPath, "sonar-project.properties"),
      propertiesFileContent.join("\n")
    );
  }

  public async scan(status: { success: boolean }): Promise<any> {
    if (!this._filesChanged && (await this._isScannedBefore())) {
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

          if (!(await this._isPropertiesFilePresent())) {
            await this._createPropertiesFile(proPath);
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
      `https://sonarcloud.io/api/measures/component?component=${await this._getProjectKey()}
      &metricKeys=lines,bugs,code_smells,vulnerabilities,duplicated_lines_density,ncloc,cognitive_complexity
      &additionalFields=metrics`,
      this._apiCallOptions
    );

    return {
      measures: response.data.component.measures,
      metrics: response.data.metrics,
    };
  }

  public async getFilesWithDuplicatedLines(): Promise<string[]> {
    try {
        // Make a request to the API endpoint
        const response = await axios.get(
            // Query for duplicated_lines_density metric only
            `https://sonarcloud.io/api/measures/component_tree?component=${this._projectKey}
            &metricKeys=duplicated_lines_density`,
            this._apiCallOptions
        );

        const duplicatedFiles: string[] = [];

        // Process the response data
        const components = response.data.components;

        // Check each component to find files with duplicated lines
        components.forEach((component: any) => {
            // Check if the component has measures
            if (component.measures) {
                // Find the measure for duplicated lines density
                const duplicatedLinesMeasure = component.measures.find((measure: any) => measure.metric === 'duplicated_lines_density');
                
                // Check if the measure exists and its value is greater than 0
                if (duplicatedLinesMeasure && parseFloat(duplicatedLinesMeasure.value) > 0) {
                    duplicatedFiles.push(component.key);
                }
            }
        });

        return duplicatedFiles;
    } catch (error: any) {
        console.error(error.message);
        throw error;
    }
}

public async getDuplications(filePaths: string[]): Promise<{ [filePath: string]: number[] }> {
  try {
    const allDuplications: any[] = [];
    const allFiles: { [key: string]: File } = {};

    // Iterate over each file path
    for (const filePath of filePaths) {
      const response = await axios.get(
        `https://sonarcloud.io/api/duplications/show?key=${encodeURIComponent(filePath)}`,
        this._apiCallOptions
      );

      // Add duplications from the response to the allDuplications array
      allDuplications.push(...response.data.duplications);
      // Iterate over files in the response
      for (const fileKey of Object.keys(response.data.files)) {
        const file = response.data.files[fileKey];
        // Add file to allFiles if it doesn't exist
        if (!allFiles[file.key]) {
          const filePath = file.key.split(":").slice(2).join(":"); // Extracting from the third segment onward
          // Add file to allFiles if it doesn't exist
          if (!allFiles[filePath]) {
            allFiles[filePath] = file;
          }
        }
      }


      // Update block references to use file name instead of _ref
      for (const duplication of response.data.duplications) {
        for (const block of duplication.blocks) {
          // Get the file key referenced by the block
          const fileKey = block._ref;

          // Find the corresponding file object
          const correspondingFile = response.data.files[fileKey];

          if (!correspondingFile) {
            console.error(`File with key ${fileKey} not found.`);
            continue;
          }

          // Update the block reference to use file name
          block._ref = correspondingFile.name;
        }
      }
  }
    // Initialize a hashmap to store file paths and their duplicated lines
    const filePathsAndDuplicationLines: { [filePath: string]: number[] } = {};

    // Iterate over each duplication
    for (const duplication of allDuplications) {
      // Iterate over each block in the duplication
      for (const block of duplication.blocks) {
        // Get the file key referenced by the block
        const fileKey = block._ref;

        // If the file path is not in the hashmap, initialize it with an empty array
        if (!filePathsAndDuplicationLines[fileKey]) {
          filePathsAndDuplicationLines[fileKey] = [];
        }

        // Add the duplicated lines from the block to the corresponding file path
        const from = block.from; // Starting line of the duplicated block
        const to = block.from + block.size - 1; // Ending line of the duplicated block
        for (let i = from; i <= to; i++) {
          // Check if the line number already exists in the array
          if (!filePathsAndDuplicationLines[fileKey].includes(i)) {
            filePathsAndDuplicationLines[fileKey].push(i);
          }
        }
      }
    }

    return filePathsAndDuplicationLines;
  } catch (error: any) {
    console.error(error.message);
    throw error;
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
        this._apiCallOptions
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
