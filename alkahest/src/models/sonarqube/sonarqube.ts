import * as vscode from "vscode";

export default class SonarQube {
  private SCToken: any;
  private organization: any;
  private projectKey: any;
  private isScanned: boolean;

  constructor(projectKey?: string) {
    this.SCToken = process.env.SONARCLOUD_TOKEN;
    this.organization = process.env.SONARCLOUD_ORGANIZATION;
    this.projectKey = projectKey || `alkahest:${this.generateProjectKey()}`;
    this.isScanned = false;
  }

  async scan(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage(
        "Please open a project before running SonarScanner"
      );

      return;
    }

    const { spawn } = require("child_process");
    const command = "sonar-scanner";
    const args = [
      `-Dsonar.host.url=https://sonarcloud.io/`,
      `-Dsonar.token=${this.SCToken}`,
      `-Dsonar.organization=${this.organization}`,
      `-Dsonar.projectKey=${this.projectKey}`,
      `-Dsonar.projectName=${workspaceFolders[0].name}`,
      `-Dsonar.sources=${workspaceFolders[0].uri.fsPath}`,
    ];

    const options = { cwd: workspaceFolders[0].uri.fsPath, stdio: "inherit" };

    const childProcess = spawn(command, args, options);

    childProcess.on("exit", (code: any) => {
      if (code === 0) {
        vscode.window.showInformationMessage(
          "SonarScanner completed successfully"
        );

        this.isScanned = true;
      } else {
        vscode.window.showErrorMessage("SonarScanner failed");
      }
    });
  }

  async getMeasures(): Promise<string | undefined> {
    if (!this.isScanned) {
      vscode.window.showErrorMessage(
        "Please run SonarScanner before trying to get measures"
      );

      return undefined;
    }

    const axios = require("axios");
    const response = await axios.get(
      `https://sonarcloud.io/api/measures/component?component=${this.projectKey}
      &metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density`
    );

    const measures = response.data.component.measures;

    return measures ? JSON.stringify(measures, null, 2) : "No measures found";
  }

  private generateProjectKey(length: number = 11): string {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }
}
