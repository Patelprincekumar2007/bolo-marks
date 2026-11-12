# Bolo Marks - Voice Marks Entry for Government School Teachers

**Code for a Billion - Bharat Agentic-AI Hackathon 2026 | Education track**

Bolo Marks is an open-source, browser-based marks-entry helper for teachers. Enter marks by voice or text in Gujarati, Hindi or English, review the table, and export an Excel-ready CSV or copy one subject's column into a sheet or portal.

The goal is to reduce repetitive typing during exam work. Bolo Marks is a helper, not an official school portal: teachers should check every entry before using it in an official record.

## Try it

- **Live app:** https://patelprincekumar2007.github.io/bolo-marks/
- **Demo with 5 sample students:** https://patelprincekumar2007.github.io/bolo-marks/#demo

No installation is needed. Try the demo with sample data before entering a real class. Chrome on Android or desktop is the intended browser for microphone input; speech support depends on the browser and device. Text entry is available without a microphone.

## Features

- **Basic mode, no API key:** select a student by roll number or name, then enter marks using short voice or typed commands.
- **Smart mode, optional Gemini AI:** use your own Gemini API key to turn a full sentence such as `Diya ne maths ma 47, Rohan absent` into table actions.
- Gujarati, Hindi and English number-word parsing, with support for Gujarati and Devanagari digits.
- One-mark, multiple-mark and subject-specific entry, plus next, previous, clear, undo, save and done commands in basic mode.
- **Absent marking:** record absence as `AB` in the table and `Absent` in CSV exports.
- **Validation:** above-maximum values are blocked in Smart mode. Basic-mode and directly typed values are checked and invalid cells are flagged; review these before export.
- **Name handling:** basic mode offers a choice when multiple students match. Smart-mode mapping reports unresolved students or subjects instead of writing those unresolved actions.
- **Copy column:** copy the selected subject's marks in the table's student order, one value per line. Check that the destination sheet or portal uses the same order and accepts the pasted format.
- **Class summary:** subject averages, highest and lowest marks, absent and missing entries, and students below 35% of the subject maximum.
- **CSV export:** includes names, subject maxima, marks, absence and totals, with UTF-8 encoding for Gujarati and Hindi text. This is a CSV file, not an `.xlsx` workbook.
- **Local saving:** class setup and marks are saved in the current browser's localStorage.

## How to use

### 1. Set up a class

Open the live app and enter:

- A class or section name.
- Subjects, one per line, in the format `Maths, 50`.
- Students, one per line, in the format `1, Aarav Patel`.

Choose **Save & Start**. The setup screen's **Load demo class** button fills sample setup fields; the demo link opens a ready sample table directly.

### 2. Enter marks in basic mode

Leave Smart mode off. Choose the voice language, allow microphone access and tap the mic, or use the command text box and **Go**.

| Command | Action |
| --- | --- |
| `roll 2` | Select the student with roll number 2 |
| `Diya Shah` | Select a matching student |
| `47` | Fill the current subject for the selected student |
| `42 38 45 40` | Fill consecutive subjects for the selected student |
| `maths 45` | Fill Maths for the selected student |
| `next` / `previous` | Move between students |
| `absent` | Fill the selected student's empty subject cells with `AB` |
| `clear` | Clear the current cell |
| `undo` | Undo the last command-generated cell change |
| `done` | Stop the microphone |

For basic mode, select the student first, then give marks. It is not a general full-sentence AI parser. You can also edit table cells directly.

### 3. Use Smart mode for full sentences

Open **Smart**, enter your own Gemini API key, enable Smart mode and save. Both spoken and typed commands then use Gemini.

Example with the demo class:

```text
Diya ne maths ma 47, Rohan absent
```

The agent receives the sentence and class context, returns structured actions, and the app maps those actions to the table. It can apply resolved actions while also showing a clarification for other items. Check the status message and resulting cells.

**Absent marking differs between modes:** a Smart-mode absent action writes `AB` to every subject for that student, including cells that already contain marks. Basic-mode `absent` fills only empty cells. Review the student before using this command.

If a Smart request fails, the app tries the same input through the basic parser. Complex sentences may need to be repeated as short basic commands. Turn Smart mode off when you want commands such as `next` or `undo` handled locally.

### 4. Review and export

Check names, selected subjects, missing cells and validation warnings. Use **Summary** to review the class, **Copy column** for one subject, or **Export Excel (CSV)** for the whole table. Export a backup before clearing browser data or replacing a class setup.

## Internet, privacy and API keys

The app has no application backend of its own. That does **not** mean all features are offline or that no data leaves the device.

| Feature | Processing and network boundary |
| --- | --- |
| Table editing, basic text commands, summary and CSV generation | Run locally in the browser once the app files are loaded; no Gemini request is needed |
| Microphone transcription | Uses the browser's `SpeechRecognition` / `webkitSpeechRecognition`. The browser may use a remote speech service, so voice input is not guaranteed offline or device-only |
| Smart mode | Requires internet and sends requests directly from the browser to Google's Gemini API |
| Loading the hosted app | Requires access to the hosting service. The project has no service worker or guaranteed offline-reload support |

For each Smart entry request, the prompt includes:

- The spoken transcript or typed sentence.
- The full configured student roster: roll numbers and names.
- Subject names and maximum marks.

The existing marks table is not included in that prompt, but the sentence itself can contain marks. Model discovery and retries may create additional Google API requests. Google's applicable API terms and data-handling rules apply; do not send student information unless you have permission under your school's rules. Use sample or anonymized data for demonstrations.

The project ships without a Gemini API key. A user's key is stored in that browser's localStorage, including the model-selection cache, and is sent to Google to authenticate API requests. Browser storage is not encrypted secret storage. Do not use a shared browser profile for private class data or keys, and never commit a key to GitHub.

Class data does not sync across browsers or devices. Clearing site data can delete both local class records and saved settings. To remove all locally stored app data and cached key copies, export anything needed first, then clear this site's browser storage. Disabling Smart mode alone does not erase a saved key.

Bolo Marks has no app usage fee. Gemini access, quotas, model availability and any charges depend on the user's Google account and current API terms; free-tier access is not guaranteed.

## Run locally

This is a static HTML/CSS/JavaScript app. No package installation or build step is required.

```bash
git clone https://github.com/Patelprincekumar2007/bolo-marks.git
cd bolo-marks
python -m http.server 8000
```

Open `http://localhost:8000` in Chrome, or `http://localhost:8000/#demo` for sample data. Use the HTTPS live app when testing on a phone. Microphone access requires a browser-supported secure context, such as HTTPS or localhost, and user permission.

## Tests

With Node.js installed, run:

```bash
node test.js
```

Verified on November 12, 2026: **101 passed, 0 failed**.

The suite checks local parsing, number handling, commands, name matching, mark validation, agent-response parsing and mapping, prompt context, and summary calculations. It includes 30 multilingual agent-response fixtures. These are predefined responses, not live Gemini calls or microphone recordings. Passing them does not establish real-world speech accuracy, live-model reliability or time saved in a classroom.

**AgentFoundry (Smart-Code)** was used to review the agent layer and add the 30 multilingual test cases. Gemini is the app's runtime AI service; AgentFoundry is not a runtime dependency.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Class setup, marks table, controls and dialogs |
| `style.css` | Responsive styling |
| `app.js` | Basic command parsing, numbers, name matching, validation and summary calculations |
| `agent.js` | Gemini prompt, API calls, model discovery/fallback, response parsing and action mapping |
| `ui.js` | Microphone control, mode selection, table updates, browser storage, copy column and CSV export |
| `test.js` | Node.js test suite |
| `LICENSE` | MIT license |

## Current limits

- This is a prototype helper, not a certified school-record system or an automatic portal submission tool.
- Voice recognition and AI can misunderstand names, subjects and numbers. Teacher review is required.
- There is no cloud backup, cross-device sync or guaranteed offline voice support.
- Classroom-scale accuracy and time savings have not been established by the automated tests.

## Author and license

Built by **Patel Princekumar** (@Patelprincekumar2007).

[MIT License](LICENSE). Free to use, copy and modify under its terms.