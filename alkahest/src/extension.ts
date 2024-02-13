// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path from 'path';
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';

import GeminiAI from './models/gemini-ai/gemini-ai';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const dotenvPath = path.resolve(__dirname, '../.env');
	dotenv.config({ path: dotenvPath });

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "alkahest" is now active!');

	const gemini = new GeminiAI();

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let geminiTest = vscode.commands.registerCommand('alkahest.geminiTest', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const response = await gemini.request("Hello, Gemini!");
		vscode.window.showInformationMessage(response);
	});

	context.subscriptions.push(geminiTest);
}

// This method is called when your extension is deactivated
export function deactivate() {}
