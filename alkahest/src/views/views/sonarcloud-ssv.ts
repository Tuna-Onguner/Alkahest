import * as vscode from "vscode";

export default class SonarCloudSecondarySidebarView {
  private static _panel: vscode.WebviewPanel | undefined;
  private static readonly _colors: { [key: string]: string } = {
    whte: "#F9F6EE",
    grn1: "#339966",
    grn2: "#669900",
    yllw: "#FDDA0D",
    orng: "#E5682D",
    red_: "#CC3333",
  };
  private static readonly _metricDescriptions: { [key: string]: string } = {
    bugs: "A coding error that will break your code and needs to be fixed immediately.",
    code_smells: "Code that is confusing and difficult to maintain.",
    duplicated_lines_density: "Identical lines of code.",
    ncloc: "The number of non-commented lines of code in the project.",
    vulnerabilities: "Code that can be exploited by hackers.",
    cognitive_complexity:
      "A measure of how difficult the application is to understand.",
  };

  public static createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.ViewColumn.Two;

    if (SonarCloudSecondarySidebarView._panel) {
      SonarCloudSecondarySidebarView._panel.reveal(column);
    } else {
      SonarCloudSecondarySidebarView._panel = vscode.window.createWebviewPanel(
        "sonarCloudSecondarySidebarView",
        "Alkahest",
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
      const num = typeof value === "string" ? Number(value) : value;

      // Check if it's a valid number and has a decimal part
      return typeof num === "number" && num === num && num % 1 !== 0;
    }

    function chooseColor(value: number): string {
      let colors = SonarCloudSecondarySidebarView._colors;

      if (value === 0) {
        return colors["whte"];
      } else if (value <= 5) {
        return colors["grn1"];
      } else if (value <= 10) {
        return colors["grn2"];
      } else if (value <= 15) {
        return colors["yllw"];
      } else if (value <= 20) {
        return colors["orng"];
      } else {
        return colors["red_"];
      }
    }

    let lines = 0;
    for (let i = 0; i < metrics.length; i++) {
      if (measures[i].metric === "lines") {
        lines = measures[i].value;
        break;
      }
    }

    let tableRows = "";
    const radius = 30;
    for (let i = 0; i < measures.length; i++) {
      const value = measures[i].value;
      const metric = measures[i].metric;
      const title = titleCase(metric.replace(/_/g, " "));
      const fullDescription =
        SonarCloudSecondarySidebarView._metricDescriptions[metric] || "";

      if (metric === "lines") {
        continue;
      }

      let percantage_value = value;
      if (metric !== "duplicated_lines_density") {
        percantage_value = (value / lines) * 100;
      }

      tableRows += `
        <tr>
          <td>
            <svg width="100" height="100">
              <circle cx="50" cy="50" r="${radius + 3}" fill="white"/>
              <circle cx="50" cy="50" r="${radius}" fill="${chooseColor(
        percantage_value
      )}"/>
              <text x="50" y="51" text-anchor="middle" dominant-baseline="middle" fill="black">${value}${
        isFloat(value) ? "%" : ""
      }</text>
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
        <title>Alkahest</title>
      </head>
      <body>
        <h1>SonarCloud Measures</h1>
        <h2>Total Lines of Code Scanned: ${lines}</h2>
        <table>
          ${tableRows}
        </table>
      </body>
    </html>
  `;
  }
}
