import * as vscode from "vscode";

export default class SonarCloudGeminiResponseSidebarView {
  private static _panel: vscode.WebviewPanel | undefined;

  public static createOrShow(context: vscode.ExtensionContext): void {
    const column = vscode.ViewColumn.Two;

    if (SonarCloudGeminiResponseSidebarView._panel) {
      SonarCloudGeminiResponseSidebarView._panel.reveal(column);
    } else {
      SonarCloudGeminiResponseSidebarView._panel =
        vscode.window.createWebviewPanel(
          "sonarCloudGeminiResponseSidebarView",
          "Gemini Response",
          column,
          {
            enableScripts: true,
          }
        );

      SonarCloudGeminiResponseSidebarView._panel.onDidDispose(
        () => {
          SonarCloudGeminiResponseSidebarView._panel = undefined;
        },
        null,
        context.subscriptions
      );
    }
  }

  public static update(response: any): void {
    if (SonarCloudGeminiResponseSidebarView._panel) {
      SonarCloudGeminiResponseSidebarView._panel.webview.html =
        SonarCloudGeminiResponseSidebarView._getWebviewContent(response);
    }
  }

  private static _getWebviewContent(response: any): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >
            </head>
            <body>
            <h1>Gemini Response</h1>
            <pre>
              <code>
                ${response}
              </code>
            </pre>
            </body>
        </html>
    `;
  }
}
