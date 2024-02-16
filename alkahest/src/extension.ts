import path from 'path';
// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';

import GeminiAI from './models/gemini-ai/gemini-ai';

//import { OpenAIMessage } from './models/openai/openai';// Not used
//import OpenAI from './models/openai/openai';// Not used

// This method is called when the extension is activated
// The extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const dotenvPath = path.resolve(__dirname, '../.env'); // Path to .env file
	dotenv.config({ path: dotenvPath }); // Load environment variables from .env file

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "alkahest" is now active!');

	const gemini = new GeminiAI(); // Create a new instance of the GeminiAI class to interact with the Gemini model
	//const openai = new OpenAI();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let geminiTest = vscode.commands.registerCommand('alkahest.geminiTest', async () => {
		// The code placed here will be executed every time the command is executed
		const response = await gemini.request("Say this is a test!");

		if (response) {
			// Display a message box to the user
			vscode.window.showInformationMessage(response);
		}
	});

	/* Not used
	let openaiTest = vscode.commands.registerCommand('alkahest.openaiTest', async () => {
		const messages: OpenAIMessage[] = [
			{
				role: "user",
				content: "Say this is a test"
			},
		];

		const response = await openai.request(messages);
		if (response) {
			vscode.window.showInformationMessage(response);
		}
	});

	context.subscriptions.push(openaiTest);
	*/

	context.subscriptions.push(geminiTest); // Add the command to the list of disposables
}

// This method is called when your extension is deactivated
export function deactivate() {}
