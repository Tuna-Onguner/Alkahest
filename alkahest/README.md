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

*All dependencies, and dev-dependencies, are listed under the file **package.json**.*

- **SonarQube:** The extension will automatically install a local copy of SonarQube via sonarqube-scanner-npm unless it is already installed. In case of a failed installation trial, follow the procedures on [sonarqube-scanner](https://www.npmjs.com/package/sonarqube-scanner) to install it manually.

- **Google Generative AI**: Refer to https://ai.google.dev/gemini-api/docs/get-started/node.

- **dotenv**

- **axios**


## Extension Settings

There are no additional settings needed to be manually satisfied by users.