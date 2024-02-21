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

  public static update(data: any): void {
    if (SonarCloudSecondarySidebarView._panel) {
      SonarCloudSecondarySidebarView._panel.webview.html =
        SonarCloudSecondarySidebarView._getWebviewContent(data);
    }
  }

  private static _getWebviewContent(data: any): string {
    function color(value: number): string {
      if (value <= 33) {
        return "#0BDA51";
      } else if (value <= 66) {
        return "#FFEA00";
      } else {
        return "#FF3131";
      }
    }

    let tableRows = "";
    for (let i = 0; i < data.length; i++) {
      const value = data[i].value;
      const metricName = data[i].metric.replace(/_/g, " ");
      const strokeDasharray = `${value * 3.14}, 314`;
      tableRows += `
            <tr>
                <td>
                  <text>${metricName.toUpperCase().concat(":")}</text>
                </td>
                <td>
                    <svg class="progress-ring" width="120" height="120">
                        <circle class="progress-ring__circle" stroke="#D3D3D3" stroke-width="4" fill="transparent" r="50" cx="60" cy="60"/>
                        <circle class="progress-ring__value" stroke="${color(
                          value
                        )}" stroke-width="4" fill="transparent" r="50" cx="60" cy="60" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="314"/>
                        <text x="50%" y="50%" text-anchor="middle" stroke="${color(
                          value
                        )}" stroke-width="1px" dy=".3em">${value * 1.0}%</text>
                    </svg>
                </td>
            </tr>
        `;
    }

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <meta 
                name="viewport" 
                content="width=device-width, initial-scale=1.0"
            />
            <title>Alkahest</title>
            <style>
                .progress-ring__circle {
                    stroke: #d2d3d4;
                }
                .progress-ring__value {
                    stroke: #4caf50;
                    stroke-linecap: round;
                    transform: rotate(-90deg);
                    transform-origin: 50% 50%;
                }
                table {
                    width: 100%;
                }
                td {
                    padding: 10px;
                }
            </style>
        </head>
        <body>
            <h1>SonarCloud Scanning Results</h1>
            <p>Here are the results of the SonarCloud scan:</p>
            <table>
                ${tableRows}
            </table>
        </body>
        </html>
    `;
  }
}
