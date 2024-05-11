import * as vscode from "vscode";
import { ColorPalatte } from "./../color-palatte";

export default class SonarCloudSecondarySidebarView {
  private static _panel: vscode.WebviewPanel | undefined;
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

      // Add the onDidReceiveMessage event listener here
      SonarCloudSecondarySidebarView._panel.webview.onDidReceiveMessage(
        message => {
          switch (message.command) {
            case 'displayBugs':

              const bugs = [
                { message: 'Bug 1', component: 'Component 1', line: 'Line 1', severity: 'Severity 1' },
                { message: 'Bug 2', component: 'Component 2', line: 'Line 2', severity: 'Severity 2' },
                { message: 'Bug 3', component: 'Component 3', line: 'Line 3', severity: 'Severity 3' },
              ];
              
              
              //const bugs = context.globalState.get("bugs") as any[];
            
              // Create a new webview panel
              const bugsPanel = vscode.window.createWebviewPanel(
                'bugs', // Identifies the type of the webview. Used internally
                'Bugs', // Title of the panel displayed to the user
                vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
                {} // Webview options. More on these later.
              );
            
              // Set the webview's HTML content
              bugsPanel.webview.html = getBugsWebviewContent(bugs);
              break;
          }
        },
        undefined,
        context.subscriptions
      );

      // Define the getBugsWebviewContent function:
      function getBugsWebviewContent(bugs: any[]) {
        let htmlContent = '<html><body><table>';

        // Add a row for each bug
        for (const bug of bugs) {
          htmlContent += `<tr><td>${bug.message}</td><td>${bug.component}</td><td>${bug.line}</td><td>${bug.severity}</td></tr>`;
        }

        htmlContent += '</table></body></html>';

        return htmlContent;
      }    
      
    }
  }

  public static update(measures: any, metrics: any, context: vscode.ExtensionContext): void {
    if (SonarCloudSecondarySidebarView._panel) {
      SonarCloudSecondarySidebarView._panel.webview.html =
        SonarCloudSecondarySidebarView._getWebviewContent(measures, metrics);

        SonarCloudSecondarySidebarView._panel.webview.onDidReceiveMessage(
          message => {
            switch (message.command) { 
              case 'displayBugs':
                const bugs = context.globalState.get("bugs");

                break;
            }
          },
          undefined,
          context.subscriptions
        );
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

      if (metric === 'bugs') {
        tableRows += `
        <tr onclick="displayBugs()">
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
        } else {
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
        <script>
          function displayBugs() {
            alert('Here are some details about the bugs...');
            console.log("it is working");
            window.parent.postMessage({ command: 'displayBugs' }, '*');
          }
        </script>
      </body>
    </html>
  `;
  }
}
