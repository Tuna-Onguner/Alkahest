*This is the README for our extension "Alkahest".*


# Alkahest

Alkahest is a comprehensive Visual Studio Code (VSCode) plugin tailored for software practitioners. 
This extension aims to scan users' projects to streamline bug detection, code duplication identification, and project evaluation tasks by seamlessly integrating with popular development tools such as SonarQube, Gemini API, and StackOverflow. 
By providing a unified environment within VSCode, Alkahest empowers users to perform these essential tasks without switching between disparate platforms, saving valuable time and improving productivity.


## Features

- **Overall Code Review Feature:** The extension will analyze to code within the developer’s VSCode
environment and auto-review it with SonarQube to provide overall code review with following metrics: number of bugs, number of code smells, duplicated lines density (percentage), number of uncommented lines, cognitive complexity, and vulnerabilities.

- **Bug Detection Feature:** The extension will analyze the code within the developer's VSCode environment to detect possible bugs.

- **Duplicated Lines Detection Feature:** The extension will analyze the code within the developer's VSCode environment to detect duplicated lines of code.

- **Integration with Gemini AI for Fixing and Suggestions:** The extension will integrate with Gemini AI provided by Google to offer solutions, suggestions and relevant references, such as Stackoverflow links, for resolving bugs and reducing duplicated lines detected by Alkahest via SonarQube.


## Requirements

*All dependencies, and dev-dependencies, are listed under the file **package-lock.json**. Some important ones are listed below.*

- **SonarQube:** The extension will automatically install a local copy of SonarQube via sonarqube-scanner-npm unless it is already installed. In case of a failed installation trial, follow the procedures on [sonarqube-scanner](https://www.npmjs.com/package/sonarqube-scanner) to install it manually.

- **Google Generative AI**: Refer to https://ai.google.dev/gemini-api/docs/get-started/node.

- **dotenv**

- **axios**


## Build Instructions

### Prerequisites

- **VSCode:** Version 1.86 or higher.

- **Environment**: Alkahest requires to use a **Unix-based operating system** since we have tested our code on MacOS X. Moreover, we are unable to guarantee whether the extension can run as expected on other types of operating systems, *including Windows*.

- **Node.js:** Ensure that Node.js is installed on your device. You can download and install it from [nodejs.org](https://nodejs.org/en). *Version 18.x or higher is required*.

- SonarCloud account with a valid API key.

- Google Generative AI, i.e. Gemini, API key.

### Installation and Execution

- **Step 0:** Clone the project to your local from this repository. Start a new terminal session from the project. Then, direct to the folder "alkahest" which is under the main folder "Alkahest", i.e. `cd alkahest`. To make sure you are in the right folder, use `ls` command; you should see package-lock.json file there.

- **Step 1:** Install dependencies using the command `npm install`. This will read the package-lock.json file and install all required packages listed there. If it fails, make sure that you succesfully completed the first steps and satisfied the prerequisites.

- **Step 2:** Create a **.env** file under the folder "alkahest", you can use **.env-example** for the correct structure.

- **Step 3:** Direct to the file "extension.ts" at path `Alkahest/alkahest/src/extension.ts`. To run the extension, use ***fn + F5*** keyboard combination on extension.ts, which will automatically start our extension on a new window.

- **Step 4:** Refer to User Manual, i.e. **alkahest-user-manual.md**. Or, see it in the Final Report.

Refer to https://code.visualstudio.com/api if you need either further assistance or guidance.


## Extension Settings

There are no additional settings needed to be manually satisfied by users.


## About Project/Extension Structure

*See "vsc-extension-quickstart.md" file under the same folder with this README.md for the offical documentation.*

To summarize, you can see the files added by us at path `Alkahest/alkahest/src`.
- `src/models has` backend implementations.
- `src/views has` frontend implementations.

And, all executable commands of our extension are listed under the file **package.json**.