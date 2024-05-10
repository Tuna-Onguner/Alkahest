import * as vscode from "vscode";

export default class SonarCloudBugsSidebarView {
  private static _panel: vscode.WebviewPanel | undefined;

  public static createOrShow(context: vscode.ExtensionContext, bugs: any[]): void {
    const column = vscode.ViewColumn.Two;

    if (SonarCloudBugsSidebarView._panel) {
      SonarCloudBugsSidebarView._panel.reveal(column);
    } else {
      SonarCloudBugsSidebarView._panel = vscode.window.createWebviewPanel(
        'SonarCloudBugsSidebarView',
        'Bugs Sidebar',
        column,
        {
          enableScripts: true,
        }
      );

      SonarCloudBugsSidebarView._panel.onDidDispose(
        () => {
          SonarCloudBugsSidebarView._panel = undefined;
        },
        null,
        context.subscriptions
      );

      SonarCloudBugsSidebarView._panel.webview.html = SonarCloudBugsSidebarView._getWebviewContent(bugs);

      SonarCloudBugsSidebarView._panel.webview.onDidReceiveMessage(
        message => {
          console.log('Received message', message);
          if (message.command === 'openFile') {
            const filePath = message.text.split(':').slice(2).join(':'); // Extract the file path
            const decodedFilePath = decodeURIComponent(filePath); // Decode the URL
            const openPath = vscode.Uri.file(decodedFilePath); // Create a Uri from the file path
            vscode.workspace.openTextDocument(openPath).then(doc => {
              vscode.window.showTextDocument(doc); // Open the file
            });
          }
        },
        undefined,
        context.subscriptions
      );
    }
  }

  private static _getWebviewContent(bugs: any[]): string {
    let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bugs Sidebar</title>
        <style>
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            padding-top: 12px;
            padding-bottom: 12px;
            text-align: left;
            background-color: #4CAF50;
            color: white;
          }
        </style>
        <script>
            const vscode = acquireVsCodeApi(); // Add this line
        </script>
      </head>
      <body>
        <h1>Welcome to Bugs Sidebar!</h1>
        <table>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Message</th>
            <th>Component</th>
            <th>Line</th>
            <th>Severity</th>
          </tr>
    `;

    // Add a row for each bug
    for (const bug of bugs) {
        htmlContent += `<tr><td>${bug.id}</td><td>${bug.type}</td><td>${bug.message}</td><td><a href="#" onclick="console.log('Clicked'); vscode.postMessage({ command: 'openFile', text: '${bug.component}' }); return false;">${bug.component}</a></td><td>${bug.line}</td><td>${bug.severity}</td></tr>`;
    }

    htmlContent += '</table></body></html>';

    return htmlContent;
  }
}