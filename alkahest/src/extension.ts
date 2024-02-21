import * as path from "path"; // The module 'path' is used to work with file and directory paths
import * as vscode from "vscode"; // The module 'vscode' contains the VS Code extensibility API
import * as dotenv from "dotenv"; // The module 'dotenv' is used to load environment variables from a .env file

import GeminiAI from "./models/gemini-ai/gemini-ai";
import SonarQube from "./models/sonarqube/sonarqube";
import SonarCloudSecondarySidebarView from "./views/views/sonarcloud-ssv";

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
      const response = await sonarQube.scan(); // Fetch the response from the SonarQube API
      const measures = response.data.component.measures;

      //console.log(measures);

      // Display the response in the seconndary sidebar
      SonarCloudSecondarySidebarView.createOrShow(context);
      SonarCloudSecondarySidebarView.update(measures);
    }
  );

  context.subscriptions.push(geminiTest); // Add the command to the list of disposables
  context.subscriptions.push(sonarQubeScan); // Add the command to the list of disposables
}

// This method is called when your extension is deactivated
export function deactivate() {}
