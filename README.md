# Seal URL Generator

**Seal URL Generator** is a Userscript designed for the browser game *Kamihime Project*. This script automatically retrieves the data of Kamihime, Eidolons, and Souls you currently own (including Awaken and Maka states) and generates a corresponding [Seal web](https://gogopowerrangers.neocities.org/seal) URL. It opens the result in a new tab, saving you the hassle of manually checking off items one by one.

## Key Features

*   **One-Click Export**: No manual input or cross-referencing required. Simply click the menu item to fetch your data automatically.
*   **Dynamic Database Synchronization**: Automatically fetches the latest database mapping files from the Seal Database server, ensuring accurate matching even after new characters or eidolons are released.
*   **Multi-Platform Support**: Supports various game servers and entry URLs, including DMM, Johren, standard versions, and R-18 versions.

## Installation

1.  **Install a Userscript Manager** (if you haven't already):
    *   Chrome / Edge / Brave: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
    *   Firefox: [Violentmonkey](https://addons.mozilla.org/firefox/addon/violentmonkey/) or Tampermonkey

2.  **Install the Script**:
    *   Copy the contents of the `SealURLGenerator.js` file from this repository and add it as a new script in your Userscript manager, or click the raw file link on GitHub to trigger the installation.

## Usage

1.  Log into *Kamihime Project* and navigate to the **Home screen (My Page)**.
2.  Click the Tampermonkey or Violentmonkey extension icon in your browser toolbar.
3.  Click **"匯出至海豹表"** (Export to Seal Database) in the script menu (Shortcut: `s`).
4.  The script will begin fetching your data in the background. Once completed, a new tab will automatically open with your personalized Seal Database result!
![Screenshot](./readme.jpg)

## Notes & Disclaimer

1.  **Execution Timing**: Please make sure to execute the script only after you have successfully logged in and loaded the Home screen. Otherwise, the script may fail to fetch the internal API data.
2.  **Safety & Privacy**: This script only reads your existing roster and inventory data. It does not modify game data, perform actions, or spend any in-game currency.
3.  **Third-Party Service**: The generated URL relies on the third-party [gogopowerrangers.neocities.org](https://gogopowerrangers.neocities.org/seal) Seal Database service.
