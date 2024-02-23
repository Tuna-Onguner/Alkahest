import * as vscode from "vscode";

export default class SonarCloudSecondarySidebarView {
  private static _panel: vscode.WebviewPanel | undefined;

  public static createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.ViewColumn.Two;

    if (SonarCloudSecondarySidebarView._panel) {
      SonarCloudSecondarySidebarView._panel.reveal(column);
    } else {
      SonarCloudSecondarySidebarView._panel = vscode.window.createWebviewPanel(
        "sonarCloudSecondarySidebarView",
        "Aklahest",
        column,
        {
          enableScripts: true,
        }
      );

      SonarCloudSecondarySidebarView._panel.onDidDispose(
        () => {
          SonarCloudSecondarySidebarView._panel = undefined;
        },
        null,
        context.subscriptions
      );
    }
  }

  public static update(measures: any, metrics: any): void {
    if (SonarCloudSecondarySidebarView._panel) {
      SonarCloudSecondarySidebarView._panel.webview.html =
        SonarCloudSecondarySidebarView._getWebviewContent(measures, metrics);
    }
  }

  private static _getWebviewContent(measures: any, metrics: any): string {
    function titleCase(str: string): string {
      return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    function isFloat(value: any): boolean {
      // Convert the value to a number if it's a string
      const num = typeof value === 'string' ? Number(value) : value;
    
      // Check if it's a valid number and has a decimal part
      return typeof num === 'number' && num === num && num % 1 !== 0;
    }

    function chooseColor(value: number) {
      const whte = "#F9F6EE"; // for no issues at all
      const grn1 = "#339966"; // for basic levels of issues
      const grn2 = "#669900"; // for intermediate levels of issues
      const yllw = "#FDDA0D"; // for advanced levels of issues
      const orng = "#E5682D"; // for severe levels of issues
      const redd = "#CC3333"; // for critical levels of issues

      return yllw;
    }

    function getFullDescription(metric: string): any {
      const fullDescriptions: any = {
        "bugs": "A coding error that will break your code and needs to be fixed immediately.",
        "code_smells": "Code that is confusing and difficult to maintain.",
        "duplicated_lines_density": "Identical lines of code.",
        "ncloc": "The number of non-commented lines of code in the project.",
        "vulnerabilities": "Code that can be exploited by hackers.",
        "cognitive_complexity": "A measure of how difficult the application is to understand.",
        //"cyclomatic_complexity": "Measurement of the minimum number of test cases required for full test coverage.", Not working
      };

      return fullDescriptions[metric];
    }

    let tableRows = "";
    const radius = 30;
    for (let i = 0; i < measures.length; i++) {
      const value = measures[i].value;
      const metric = measures[i].metric;
      const title = titleCase(metric.replace(/_/g, " "));
      const fullDescription = getFullDescription(metric);

      tableRows += `
        <tr>
          <td>
            <svg width="100" height="100">
              <circle cx="50" cy="50" r="${(radius + 3)}" fill="white"/>
              <circle cx="50" cy="50" r="${radius}" fill="${chooseColor(value)}"/>
              <text x="50" y="51" text-anchor="middle" dominant-baseline="middle" fill="black">${value}${isFloat(value) ? "%" : ""}</text>
            </svg>
          </td>
          <td>
            <p style="margin-bottom: 0;">${title}</p>
            <p style="font-size: 0.8em; color: grey; margin-top: 0.5em;">${fullDescription}</p>
          </td>
        </tr>
      `;
  }
  
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>Aklahest</title>
      </head>
      <body>
        <h1>SonarCloud Measures</h1>
        <table>
          ${tableRows}
        </table>
      </body>
    </html>
  `;
  }
}
