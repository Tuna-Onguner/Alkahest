import * as path from "path"; // The module 'path' is used to work with file and directory paths
import * as vscode from "vscode"; // The module 'vscode' contains the VS Code extensibility API
import * as dotenv from "dotenv"; // The module 'dotenv' is used to load environment variables from a .env file

import GeminiAI from "./models/gemini-ai/gemini-ai";
import SonarQube from "./models/sonarqube/sonarqube";

import SonarCloudGeminiResponseSidebarView from "./views/views/sonarcloud-gsv";
import SonarCloudDuplicationsSidebarView from "./views/views/sonarcloud-dlv";
import SonarCloudMeasuresSidebarView from "./views/views/sonarcloud-msv";
import SonarCloudBugsSidebarView from "./views/views/sonarcloud-bsv";

// This method is called when the extension is activated
// The extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Load environment variables from .env file
  const dotenvPath = path.resolve(__dirname, "../.env"); // Path to .env file
  dotenv.config({ path: dotenvPath });

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  //console.log('Congratulations, your extension `alkahest` is now active!');

  const gemini = new GeminiAI(); // Create a new instance of the GeminiAI class to interact with the Gemini model
  const sonarQube = new SonarQube(); // Create a new instance of the SonarQube class to interact with the SonarQube model

  // Store the state of the CodeLens
  let codeLensState: any = {};

  const codeLensProvider = {
    provideCodeLenses(): vscode.CodeLens[] {
      const codeLenses: vscode.CodeLens[] = [];

      const bugs: any[] = context.globalState.get("bugs") || [];

      for (const bug of bugs) {
        // Only add the CodeLens if it hasn't been clicked yet
        if (!codeLensState[bug.id]) {
          const line = bug.line;
          const range = new vscode.Range(line - 1, 0, line - 1, 0);
          const command: vscode.Command = {
            title: "Solve with Gemini AI",
            command: "alkahest.solveWithGeminiAI",
            tooltip: "This will solve the issue with Gemini AI",
            arguments: [bug], // Pass the bug as an argument to the command
          };

          codeLenses.push(new vscode.CodeLens(range, command));
        }
      }

      return codeLenses;
    },
  };

  let codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
    { scheme: "file" },
    codeLensProvider
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let initializeSQ = vscode.commands.registerCommand(
    "alkahest.initializeSQ",
    async () => {
      // The code placed here will be executed every time the command is executed
      await sonarQube.initializeKey();
    }
  );

  let sonarQubeScan = vscode.commands.registerCommand(
    "alkahest.sonarQubeScan",
    async () => {
      //console.log("changes seen");
      let status = {
        success: false,
      };

      await sonarQube.scan(status); // Fetch the response from the SonarQube API

      // Execute the command to get the measures from the SonarQube API
      if (status.success) {
        vscode.commands.executeCommand("alkahest.sonarQubeGetMeasures");
      }
    }
  );

  let sonarQubeGetMeasures = vscode.commands.registerCommand(
    "alkahest.sonarQubeGetMeasures",
    async () => {
      const response = await sonarQube.getMeasures(); // Fetch the metrics from the SonarQube API

      // Display the response in the seconndary sidebar
      SonarCloudMeasuresSidebarView.createOrShow(context);
      SonarCloudMeasuresSidebarView.update(response.measures, response.metrics);
    }
  );

  let sonarQubeGetDuplications = vscode.commands.registerCommand(
    "alkahest.sonarQubeGetDuplications",
    async () => {
      const filePath = await sonarQube.getFilesWithDuplicatedLines(); // Fetch the files with duplicated lines from the SonarQube API
      const response = await sonarQube.getDuplications(filePath); // Fetch the duplications from the SonarQube API

      SonarCloudDuplicationsSidebarView.createOrShow(
        context,
        response,
        filePath
      ); // Create or show the webview panel
      SonarCloudDuplicationsSidebarView.update(filePath, response); // Update the webview panel with the duplicated files
    }
  );

  let sonarQubeGetIssues = vscode.commands.registerCommand(
    "alkahest.sonarQubeGetIssues",
    async () => {
      const issues = await sonarQube.getIssues(); // Fetch the issues from the SonarQube API

      // Prepare the issues for the table
      const bugs = issues.map(
        (
          issue: {
            type: any;
            message: any;
            component: any;
            line: any;
            severity: any;
          },
          index: number
        ) => ({
          id: index + 1,
          type: issue.type,
          message: issue.message,
          component: issue.component,
          line: issue.line,
          severity: issue.severity,
        })
      );

      //console.log(bugs); // Display the issues in the console
      context.globalState.update("bugs", bugs); // Store the issues in the global state

      // Set the webview's HTML content
      SonarCloudBugsSidebarView.createOrShow(context, bugs); // Pass the 'context' argument to the 'createOrShow' method
    }
  );

  let solveWithGeminiAI = vscode.commands.registerCommand(
    "alkahest.solveWithGeminiAI",
    async (args) => {
      let { message, component, line } = args; // Destructure the 'args' object to get the 'message', 'component', and 'line' properties

      // Read the file content
      const document = await vscode.workspace.openTextDocument(component);
      const text = document.getText();

      // Copy line from the file + 10 lines above and below
      const lines = text.split("\n");

      const start = Math.max(0, line - 10);
      const end = Math.min(lines.length, line + 10);

      const code = lines.slice(start, end).join("\n");

      // Call the Gemini model to solve the issue
      const response = await gemini.request(
        "Can you come up with a solution for this bug, please?",
        "And, find relevant StackOverflow posts for this bug.",
        code,
        message
      );

      // Display the response in the webview
      SonarCloudGeminiResponseSidebarView.createOrShow(context);
      SonarCloudGeminiResponseSidebarView.update(response);

      // Set the CodeLens state to true
      codeLensState[args.id] = true;

      // Refresh the CodeLens
      //vscode.commands.executeCommand("editor.action.codeLens.refresh");
    }
  );

  let sonarQubeLogout = vscode.commands.registerCommand(
    "alkahest.sonarQubeLogout",
    async () => {
      await sonarQube.logout(); // Logout from the SonarQube API
    }
  );

  // Automatically called commands
  context.subscriptions.push(initializeSQ);
  context.subscriptions.push(solveWithGeminiAI);

  // Directly executable commands
  context.subscriptions.push(sonarQubeScan);
  context.subscriptions.push(sonarQubeGetMeasures);
  context.subscriptions.push(sonarQubeGetDuplications);
  context.subscriptions.push(sonarQubeGetIssues);
  context.subscriptions.push(sonarQubeLogout);

  // Additonal disposables
  context.subscriptions.push(codeLensProviderDisposable);

  // Execute the command to initialize the SonarQube API
  vscode.commands.executeCommand("alkahest.initializeSQ"); // Execute the command to initialize the SonarQube API
}

// This method is called when your extension is deactivated
export function deactivate() {
  vscode.commands.executeCommand("alkahest.sonarQubeLogout"); // Execute the command to logout from the SonarQube API
}
