# Bolo Marks - Voice Marks-Entry Helper for Government School Teachers

**Code for a Billion - Bharat Agentic-AI Hackathon 2026 | Education track**

Government school teachers in India spend hours every exam season typing student marks one by one into portals and spreadsheets. For a class of 50 students and several subjects that means hundreds of manual entries - slow, tiring and error-prone, and the time comes straight out of teaching. Many teachers work in Gujarati or Hindi and are not comfortable with complex software.

**Bolo Marks** is a free, browser-based helper: the teacher speaks roll number and marks in **Gujarati, Hindi or English**, the app fills a marks table, flags mistakes (marks above the maximum, missing entries) and exports a ready Excel/CSV sheet. Zero cost, works in Chrome on a phone or laptop, nothing to install, data stays on the teacher's device.

## Features

- Voice entry in Gujarati, Hindi and English (Web Speech API, free in Chrome)
- Speak roll number ("roll 5", "રોલ ૫", "रोल पांच") or the student's name
- Speak one mark or a whole row ("42 38 45 40"), or one subject ("maths 45", "ગણિત પિસ્તાલીસ")
- Understands number words 0-100 in all three languages, plus native digits (૭૮, ७८)
- Live validation: marks above the subject maximum turn red instantly
- Voice commands: next, previous, clear, undo, save, done
- Ambiguous names: tap to pick from a short list
- Export to CSV that opens directly in Excel (Gujarati/Hindi names preserved)
- Works fully offline after first load; class data saved on the device (localStorage)
- Mobile-first: big mic button, works on a phone in one hand

## Live demo

(Deploy link goes here - see "Deploy" below.)

## Run locally

Open `index.html` in Chrome. That is the whole setup. For voice input, serve it over http(s) or open via GitHub Pages / Netlify (Chrome requires a secure origin for the microphone).

## Deploy (free, 5 minutes)

### Option A - Netlify Drop (fastest live link)
1. Go to https://app.netlify.com/drop (free account).
2. Drag this whole folder onto the page.
3. Netlify gives you a live `https://...netlify.app` link immediately. Done.

### Option B - GitHub Pages (live link from your repo)
1. Create a new public repository on GitHub (e.g. `bolo-marks`).
2. Upload these files (Add file > Upload files, or `git push`).
3. Settings > Pages > Source: `main` branch, `/ (root)` > Save.
4. Your app is live at `https://<username>.github.io/bolo-marks/`.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | The whole app shell (setup screen + entry screen) |
| `style.css` | Mobile-first styling |
| `app.js` | Voice parsing engine: number words (GU/HI/EN, 0-100), commands, name matching, validation |
| `ui.js` | Table, mic control, CSV export, localStorage |
| `test.js` | Node test suite for the parser (`node test.js`, 43 tests) |

## Impact

One government school teacher saves an estimated 1-2 hours per exam. There are lakhs of government school teachers across India; the tool needs no training, no install and no budget.

## License

MIT - free for anyone to use, copy and improve.
