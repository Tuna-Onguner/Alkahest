import * as path from "path"; // The module 'path' is used to work with file and directory paths
import * as vscode from "vscode"; // The module 'vscode' contains the VS Code extensibility API
import * as dotenv from "dotenv"; // The module 'dotenv' is used to load environment variables from a .env file

import GeminiAI from "./models/gemini-ai/gemini-ai";
import SonarQube from "./models/sonarqube/sonarqube";
import SonarCloudSecondarySidebarView from "./views/views/sonarcloud-ssv";
import SonarQubeDuplicatedLines from "./views/views/sonarqube-dlv";

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

  let sonarQubeScan = vscode.commands.registerCommand(
    "alkahest.sonarQubeScan",
    async () => {
      await sonarQube.scan(); // Fetch the response from the SonarQube API
      // Execute the command to get the measures from the SonarQube API
      vscode.commands.executeCommand("alkahest.sonarQubeGetMeasures");
    }
  );

  let sonarQubeGetMeasures = vscode.commands.registerCommand(
    "alkahest.sonarQubeGetMeasures",
    async () => {
      const response = await sonarQube.getMeasures(); // Fetch the metrics from the SonarQube API

      // Display the response in the seconndary sidebar
      SonarCloudSecondarySidebarView.createOrShow(context);
      SonarCloudSecondarySidebarView.update(response.measures, response.metrics);
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
      const filePath = await sonarQube.getFilesWithDuplicatedLines(); // Fetch the files with duplicated lines from the SonarQube API
      SonarQubeDuplicatedLines.createOrShow(context); // Create or show the webview panel
      SonarQubeDuplicatedLines.update(filePath); // Update the webview panel with the duplicated files
      //const response = await sonarQube.getDuplications(filePath); // Fetch the duplications from the SonarQube API
      //console.log(response.filePathsAndDuplicationLines); // Log the response to the console
    }
  );

  context.subscriptions.push(geminiTest); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeScan); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeGetMeasures); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeLogout); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeGetDuplications); // Add the command to the list of disposables
}

// This method is called when your extension is deactivated
export function deactivate() {
  vscode.commands.executeCommand("alkahest.sonarQubeLogout"); // Execute the command to logout from the SonarQube API
}
