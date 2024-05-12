import * as fs from "fs";
import * as vscode from "vscode";

import { ColorPalatte } from "../color-palatte";

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
        "sonarCloudDuplicationsSidebarView",
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
            const { filePaths } =
              SonarQubeDuplicatedLines._getFilePathsFromKeys(
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
    duplications: { [filePath: string]: number[] }
  ): void {
    const { fullPaths } = SonarQubeDuplicatedLines._getFilePathsFromKeys(
      duplicatedKeys,
      duplications
    ); // Destructure fullPaths from the returned object

    if (SonarQubeDuplicatedLines._panel) {
      SonarQubeDuplicatedLines._panel.webview.html =
        SonarQubeDuplicatedLines._getWebviewContent(fullPaths, duplications); // Pass fullPaths instead of duplicatedPaths
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

  private static _getWebviewContent(
    duplicatedPaths: string[],
    duplications: { [filePath: string]: number[] }
  ): string {
    let i = 1;
    let listItems = "";

    let cd = ColorPalatte.colorDeciderByPercentage;

    const maxPathLength = 64;

    for (const path of duplicatedPaths) {
      const truncatePath = (filePath: string) => {
        if (filePath.length > maxPathLength) {
          return "..." + filePath.slice(-maxPathLength);
        }

        return filePath;
      };

      const totalLines =
        SonarQubeDuplicatedLines._getTotalLinesForDocument(path);
      const duplicatedLines =
        SonarQubeDuplicatedLines._getDuplicatedLinesLengthForPath(
          path,
          duplications
        ) || 1;

      const percentage = ((duplicatedLines / totalLines) * 100).toFixed(2);

      // Append the list item with the percentage
      listItems += `
        <li class="path-item" 
            title="${path}" 
            data-path="${path}">
          ${i}. ${truncatePath(path)}
          <span style="float: right; 
                      color: ${cd(Number.parseFloat(percentage))};
                      font-weight: bold;">
            ${percentage}%
          </span>
        </li>
      `;

      i++;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, 
                initial-scale=1.0" />
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .path-item {
              font-size: 12px;
              cursor: pointer;
              display: inline-block;
              width: 99%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              padding: 8px 4px;
              /*border-bottom: 1px solid #ddd;*/
              transition: background-color 0.3s ease, color 0.3s ease;
              border-radius: 5px;
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
          <h1>Welcome to Duplicated Lines Paths!</h1>
          <h2>We have found ${duplicatedPaths.length} duplicated paths.</h2>

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

        const editor = await vscode.window.showTextDocument(document, {
          selection: decorations[0].range,
        });

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

  private static _getTotalLinesForDocument(filePath: string): number {
    try {
      // Read the file synchronously
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // Split the content into lines
      const lines = fileContent.split("\n");

      // Return the total number of lines
      return lines.length;
    } catch (error) {
      console.error(`Error reading file ${filePath}: ${error}`);
      return 0; // Return 0 if there's an error
    }
  }

  private static _getFilePathFromFullPath(
    fullPath: string,
    filePaths: string[]
  ): string | undefined {
    for (const filePath of filePaths) {
      if (fullPath.includes(filePath)) {
        return filePath;
      }
    }

    return undefined;
  }

  private static _getDuplicatedLinesLengthForPath(
    fullPath: string,
    duplications: { [filePath: string]: number[] }
  ): number | undefined {
    const filePaths = Object.keys(duplications);
    const filePath = SonarQubeDuplicatedLines._getFilePathFromFullPath(
      fullPath,
      filePaths
    );

    if (filePath) {
      return duplications[filePath].length;
    }

    return undefined;
  }
}
