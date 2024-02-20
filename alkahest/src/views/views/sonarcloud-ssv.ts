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
        "SonarCloud Scanning Results",
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
        </head>
        <body>
            <h1>SonarCloud Scanning Results</h1>
            <p>Here are the results of the SonarCloud scan:</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        </body>
        </html>
        `;
  }
}
