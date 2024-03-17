import { execSync } from "child_process";

const packageName = "sonarqube-scanner";

export function isPackageInstalled(): boolean {
  try {
    execSync(`npm list -g ${packageName}`);
    return true;
  } catch (error) {
    return false;
  }
}

export function installPackage(): boolean {
  try {
    execSync(`npm install -g ${packageName}`);
    return true;
  } catch (error) {
    return false;
  }
}
