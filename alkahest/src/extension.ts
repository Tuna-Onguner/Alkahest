import * as path from "path"; // The module 'path' is used to work with file and directory paths
import * as vscode from "vscode"; // The module 'vscode' contains the VS Code extensibility API
import * as dotenv from "dotenv"; // The module 'dotenv' is used to load environment variables from a .env file

import GeminiAI from "./models/gemini-ai/gemini-ai";
import SonarQube from "./models/sonarqube/sonarqube";
import SonarCloudSecondarySidebarView from "./views/views/sonarcloud-ssv";
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

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let geminiTest = vscode.commands.registerCommand(
    "alkahest.geminiTest",
    async () => {
      // The code placed here will be executed every time the command is executed
      const response = await gemini.request("Say this is a test!");

      if (response) {
        // Display a message box to the user
        vscode.window.showInformationMessage(response);
      }
    }
  );

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
      let status = { success: false }; // Initialize the status object
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

      const bugs = context.globalState.get("bugs"); // Retrieve the issues from the global state
      // Display the response in the seconndary sidebar
      SonarCloudSecondarySidebarView.createOrShow(context);
      SonarCloudSecondarySidebarView.update(response.measures, response.metrics, context);
    }
  );
  

  let sonarQubeLogout = vscode.commands.registerCommand(
    "alkahest.sonarQubeLogout",
    async () => {
      await sonarQube.logout(); // Logout from the SonarQube API
    }
  );

  let sonarQubeGetDuplications = vscode.commands.registerCommand(
    "alkahest.sonarQubeGetDuplications",
    async () => {
      const response = await sonarQube.getDuplications(); // Fetch the duplications from the SonarQube API
      //console.log(response);
    }
  );

  let sonarQubeGetIssues = vscode.commands.registerCommand(
    "alkahest.sonarQubeGetIssues",
    async () => {
      const issues = await sonarQube.getIssues(); // Fetch the issues from the SonarQube API
  
      // Prepare the issues for the table
      const bugs = issues.map((issue: { type: any; message: any; component: any; line: any; severity: any; }, index: number) => ({
        id: index + 1,
        type: issue.type,
        message: issue.message,
        component: issue.component,
        line: issue.line,
        severity: issue.severity,
      }));
  
      console.log(bugs); // Display the issues in the console
      context.globalState.update("bugs", bugs); // Store the issues in the global state
  
      // Set the webview's HTML content
      SonarCloudBugsSidebarView.createOrShow(context, bugs); // Pass the 'context' argument to the 'createOrShow' method
    }
  );

  context.subscriptions.push(geminiTest); // Add the command to the list of disposables
  context.subscriptions.push(initializeSQ); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeScan); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeGetMeasures); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeLogout); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeGetDuplications); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeGetIssues); // Add the command to the list of disposables

  vscode.commands.executeCommand("alkahest.initializeSQ"); // Execute the command to initialize the SonarQube API
}

// This method is called when your extension is deactivated
export function deactivate() {
  vscode.commands.executeCommand("alkahest.sonarQubeLogout"); // Execute the command to logout from the SonarQube API
}
