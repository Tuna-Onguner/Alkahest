import * as vscode from "vscode";

export default class SonarQubeDuplicatedLines {
  private static _panel: vscode.WebviewPanel | undefined;

  public static createOrShow(
    context: vscode.ExtensionContext,
    duplications: { [filePath: string]: number[] },
    keys: string[]
  ): void {
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
        (message) => {
          // Open the file when a path is clicked
          (async () => {
            const { filePaths } = SonarQubeDuplicatedLines._getFilePathsFromKeys(
              keys,
              duplications
            );

            const index = filePaths.findIndex((filePath) =>
              message.filePath.includes(filePath)
            );

            if (index !== -1) {
              //const filePath = filePaths[index]; // Get the corresponding file path
              const duplicationKey = Object.keys(duplications)[index]; // Get the key corresponding to the file path
              const duplicationLines = duplications[duplicationKey]; // Get the duplicated lines for the key

              try {
                await vscode.commands.executeCommand(
                  "vscode.open",
                  vscode.Uri.file(message.filePath)
                );
                // Highlight duplicated lines when a path is clicked
                await SonarQubeDuplicatedLines.highlightDuplicatedLines(
                  message.filePath,
                  duplicationLines
                );
              } catch (err) {
                console.error(err);
              }
            } else {
              console.error(
                `message.filePath doesn't include any filePath item.`
              );
            }
          })();
        },
        undefined,
        context.subscriptions
      );
    }
  }

  public static update(
    duplicatedKeys: string[],
    duplications: { [filePath: string]: number[] },
  ): void {
    const { fullPaths } = SonarQubeDuplicatedLines._getFilePathsFromKeys(
      duplicatedKeys,
      duplications
    ); // Destructure fullPaths from the returned object

    if (SonarQubeDuplicatedLines._panel) {
      SonarQubeDuplicatedLines._panel.webview.html =
        SonarQubeDuplicatedLines._getWebviewContent(fullPaths); // Pass fullPaths instead of duplicatedPaths
    }
  }

  private static _getFilePathsFromKeys(
    keys: string[],
    duplications: { [filePath: string]: number[] }
  ): { filePaths: string[]; fullPaths: string[] } {
    const fullPaths: string[] = [];
    const filePaths: string[] = [];
    const duplicatedKeysArray = Object.keys(duplications);

    keys.forEach((key) => {
      const parts = key.split(":");
      if (parts.length === 3) {
        const filePath = parts[2];
        // Check if the filePath is present in duplicatedKeysArray
        if (duplicatedKeysArray.includes(filePath)) {
          const fullPath = vscode.Uri.joinPath(
            vscode.workspace.workspaceFolders![0].uri,
            filePath
          ).fsPath;
          fullPaths.push(fullPath);
          filePaths.push(filePath);
        }
      } else {
        console.error(`Invalid file key: ${key}`);
      }
    });
    return { filePaths, fullPaths };
  }

  private static _getWebviewContent(duplicatedPaths: string[]): string {
    let listItems = "", i = 1;
    for (const path of duplicatedPaths) {
      // Truncate text if longer than 180px and add ellipsis
      const truncatedPath = path.length > 80 ? `${path.slice(0, 77)}...` : `${path}`;
      listItems += `<li class="path-item" title="${path}" data-path="${path}">${i}. ${truncatedPath}</li>`;

      i = i + 1;
    }
    
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, 
                initial-scale=1.0" />
          <title>Duplicated Lines</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            h1 {
              font-size: 1.5em;
              margin-bottom: 20px;
            }
            .path-item {
              font-size: 12px;
              cursor: pointer;
              width: 94%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              padding: 8px 0;
              border-bottom: 1px solid #ddd;
              transition: background-color 0.3s ease, color 0.3s ease;
            }
            .path-item:hover {
              background-color: #f0f0f0;
              color: #333;
            }
            ul {
              list-style-type: none;
              padding: 0;
            }
            li {
              margin-bottom: 0;
            }
          </style>
        </head>
        <body>
          <h1>Duplicated Lines Paths</h1>
          <ul>${listItems}</ul>
      
          <script>
            const vscode = acquireVsCodeApi();
      
            document.querySelectorAll('.path-item').forEach(item => {
              item.addEventListener('click', event => {
                const filePath = event.currentTarget.getAttribute('data-path');
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
  public static async highlightDuplicatedLines(
    filePath: string,
    duplicatedLines: number[] = []
  ): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(document);

      // Check if duplicatedLines is defined
      if (duplicatedLines && duplicatedLines.length > 0) {
        const decorations: vscode.DecorationOptions[] = duplicatedLines.map(
          (line) => {
            const startPosition = new vscode.Position(line - 1, 0); // Lines in VS Code are 0-indexed
            const endPosition = new vscode.Position(
              line - 1,
              Number.MAX_SAFE_INTEGER
            ); // End of the line
            const range = new vscode.Range(startPosition, endPosition);
            return { range };
          }
        );

        // Apply decorations to highlight duplicated lines
        editor.setDecorations(
          vscode.window.createTextEditorDecorationType({
            backgroundColor: "rgba(253, 218, 13, 0.3)",
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
