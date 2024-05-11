import path from "path";
import * as vscode from "vscode";

import { ColorPalatte } from "../color-palatte";

export default class SonarCloudBugsSidebarView {
  private static _panel: vscode.WebviewPanel | undefined;
  private static _fullPath = vscode.Uri.file("").fsPath;

  public static createOrShow(
    context: vscode.ExtensionContext,
    bugs: any[]
  ): void {
    const column = vscode.ViewColumn.Two;

    if (SonarCloudBugsSidebarView._panel) {
      SonarCloudBugsSidebarView._panel.reveal(column);
    } else {
      SonarCloudBugsSidebarView._panel = vscode.window.createWebviewPanel(
        "SonarCloudBugsSidebarView",
        "Bugs Sidebar",
        column,
        {
          enableScripts: true,
        }
      );

      let workspaceRoot;

      for (const bug of bugs) {
        const filePath = bug.component.split(":").slice(2).join(":"); // Extract the file path
        const decodedFilePath = decodeURIComponent(filePath); // Decode the URL

        // Get the workspace root path
        if (vscode.workspace.workspaceFolders) {
          workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        } else {
          console.error("No workspace is open");
          return;
        }

        // Combine the workspace root path and the file path
        SonarCloudBugsSidebarView._fullPath = path.join(
          workspaceRoot,
          decodedFilePath
        );

        bug.component = SonarCloudBugsSidebarView._fullPath;
      }

      SonarCloudBugsSidebarView._panel.onDidDispose(
        () => {
          SonarCloudBugsSidebarView._panel = undefined;
        },
        null,
        context.subscriptions
      );

      SonarCloudBugsSidebarView._panel.webview.html =
        SonarCloudBugsSidebarView._getWebviewContent(bugs);

      SonarCloudBugsSidebarView._panel.webview.onDidReceiveMessage(
        (message) => {
          (async () => {
            if (message.command === "openFile") {
              await vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.file(message.text)
              );

              await SonarCloudBugsSidebarView._highlightBuggedLine(
                message.text,
                [message.line]
              );
            }
          })();
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
            background-color: #1E90FF;
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
            <th>Message</th>
            <th>Component</th>
            <th>Line</th>
            <th>Severity</th>
          </tr>
    `;

    // Add a row for each bug
    for (const bug of bugs) {
      htmlContent += `<tr>
        <td>${bug.id}</td>
        <td>${bug.message}</td>
        <td><a href="#" onclick="
          vscode.postMessage(
            { 
              command: 'openFile', 
              text: '${bug.component}', 
              line: ${bug.line} 
            }
          ); 
          
          return false;">${bug.component}</a></td>
        <td>${bug.line}</td><td style="background-color: ${(function () {
        switch (bug.severity) {
          case "BLOCKER":
            return ColorPalatte.red();
          case "CRITICAL":
            return ColorPalatte.orange();
          case "MAJOR":
            return ColorPalatte.yellow();
          case "MINOR":
            return ColorPalatte.green();
          case "INFO":
            return ColorPalatte.light_green();
          default:
            return ColorPalatte.white();
        }
      })()}; color: black;">${bug.severity}</td>
      </tr>`;
    }

    htmlContent += "</table></body></html>";

    return htmlContent;
  }

  private static async _highlightBuggedLine(
    filePath: string,
    lines: number[] = []
  ): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(filePath);

      // Check if duplicatedLines is defined
      if (lines && lines.length > 0) {
        const decorations: vscode.DecorationOptions[] = lines.map((line) => {
          const startPosition = new vscode.Position(line - 1, 0); // Lines in VS Code are 0-indexed
          const endPosition = new vscode.Position(
            line - 1,
            Number.MAX_SAFE_INTEGER
          ); // End of the line

          const range = new vscode.Range(startPosition, endPosition);

          return { range };
        });

        const editor = await vscode.window.showTextDocument(document, {
          selection: decorations[0].range,
        });

        // Apply decorations to highlight duplicated lines
        editor.setDecorations(
          vscode.window.createTextEditorDecorationType({
            backgroundColor: "rgba(204, 51, 51, 0.3)",
          }),
          decorations
        );
      } else {
        console.warn("No duplicated lines found.");
      }
    } catch (error) {
      console.error(error);
    }
  }
}
