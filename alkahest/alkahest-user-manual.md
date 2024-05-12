*This is the User Manual for Alkahest. Also available in the Final Report. Refer to the demo video for visual guidance.*


## Phase 1: Scanning

- **Step 1:** After the extension is started, open the folder of the project that you want to auto-review.

- **Step 2:** Then, use the command `SonarQube Scan` to start scanning. This may take some time depending on your active connection speed and the size of the code base you are trying to scan. Be patient and wait for the scanning completes.

- **Step 3:** You will see the overall review of your project which will be automatically displayed once the scanning is completed. This view is static unless you re-scan the project, feel free to close it; you can always bring it back via the command `SonarQube Get Measures`.


## Phase 2: Evaluation

- **Duplications:** Use the command `SonarQube Get Duplications` to see the files with duplicated lines. This view is dynamic, click on the filename to direct to the file; the duplicated lines will be highlighted with the color yellow.

- **Bugs:** Use the command `SonarQube Get Bugs` to see the bugs we found. In the view, you can see where the bug is, why it is an issue, and how urgently it is needed to solved, i.e. its severity. This view is also dynamic, click on the path to direct to the file, the line causing the bug will be highlighted with the color red. At the top of this line, you will see an option, i.e. VSCode CodeLens, saying `Solve with Gemini AI`. Click it to ask Gemini AI's help to solve the bug, this action will lauch another sidebar view with Gemini's response once it is received.


## Note

Scan command will automatically initialize a `sonar-project.properties` file unless there is already one. Do not delete it, it is required. If you delete it, Alkahest will contiue to create a new one again and again.