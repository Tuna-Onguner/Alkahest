import * as vscode from "vscode";

export default class SonarQubeDuplicatedLines {
  private static _panel: vscode.WebviewPanel | undefined;

  public static createOrShow(context: vscode.ExtensionContext, duplications: { [filePath: string]: number[] }): void {
    const column = vscode.ViewColumn.Two;

    if (SonarQubeDuplicatedLines._panel) {
      SonarQubeDuplicatedLines._panel.reveal(column);
    } else {
      SonarQubeDuplicatedLines._panel = vscode.window.createWebviewPanel(
        "sonarQubeDuplicatedLines",
        "Duplicated Lines",
        column,
        {
          enableScripts: true,
        }
      );

      SonarQubeDuplicatedLines._panel.onDidDispose(
        () => {
          SonarQubeDuplicatedLines._panel = undefined;
        },
        null,
        context.subscriptions
      );

      // Handle messages from the webview
      SonarQubeDuplicatedLines._panel.webview.onDidReceiveMessage(
        message => {
          // Open the file when a path is clicked
          (async () => {
            try {
              await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(message.filePath));
              // Highlight duplicated lines when a path is clicked
              await SonarQubeDuplicatedLines.highlightDuplicatedLines(message.filePath, duplications[message.filePath]);
            } catch (err) {
              console.error(err);
            }
          })();
        },
        undefined,
        context.subscriptions
      );
    }
  }

  public static update(duplicatedKeys: string[]): void {
    const duplicatedPaths = SonarQubeDuplicatedLines.getFilePathsFromKeys(duplicatedKeys);
    if (SonarQubeDuplicatedLines._panel) {
      SonarQubeDuplicatedLines._panel.webview.html = SonarQubeDuplicatedLines._getWebviewContent(duplicatedPaths);
    }
  }

  public static getFilePathsFromKeys(keys: string[]): string[] {
    const filePaths: string[] = [];
    keys.forEach(key => {
      const parts = key.split(":");
      if (parts.length === 3) {
        const filePath = parts[2];
        const fullPath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, filePath).fsPath;

        filePaths.push(fullPath);
      } else {
        console.error(`Invalid file key: ${key}`);
      }
    });
    return filePaths;
  }

  private static _getWebviewContent(duplicatedPaths: string[]): string {
    let listItems = "";
    for (const path of duplicatedPaths) {
      listItems += `<li><a href="#" data-path="${path}">${path}</a></li>`;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Duplicated Lines</title>
        </head>
        <body>
          <h1>Duplicated Lines Paths</h1>
          <ul>${listItems}</ul>

          <script>
            const vscode = acquireVsCodeApi();

            document.querySelectorAll('a').forEach(link => {
              link.addEventListener('click', event => {
                event.preventDefault();
                const filePath = event.target.getAttribute('data-path');
                vscode.postMessage({
                  command: 'openFile',
                  filePath: filePath
                });
              });
            });
          </script>
        </body>
      </html>
    `;
  }

// Method to highlight duplicated lines in the editor
public static async highlightDuplicatedLines(filePath: string, duplicatedLines: number[] = []): Promise<void> {
  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(document);
    
    // Check if duplicatedLines is defined
    if (duplicatedLines && duplicatedLines.length > 0) {
      const decorations: vscode.DecorationOptions[] = duplicatedLines.map(line => {
        const startPosition = new vscode.Position(line - 1, 0); // Lines in VS Code are 0-indexed
        const endPosition = new vscode.Position(line - 1, Number.MAX_SAFE_INTEGER); // End of the line
        const range = new vscode.Range(startPosition, endPosition);
        return { range };
      });

      // Apply decorations to highlight duplicated lines
      editor.setDecorations(vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 0, 0, 0.3)'
      }), decorations);
    } else {
      console.warn('No duplicated lines found.');
    }
  } catch (error) {
    console.error(error);
  }
}


}
