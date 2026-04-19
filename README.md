# Data Toolkit

## V2.0

Data Toolkit now ships as two extensions only:

- A polished Chrome extension for transfer-time calculations
- A GNOME Shell extension with a top-bar utility for live upload/download speed monitoring and calculations

The old shell script and Python tray launcher were removed so the project stays focused on the two supported interfaces.

<table>
  <tr>
    <td width="58%" valign="top">
      <img src="/media/demo.gif" alt="RFPC demo" />
    </td>
    <td width="42%" valign="top">
      <img src="/media/preview1.png" alt="RFPC screenshot 1" />
      <!-- <img src="/media/preview2.png" alt="RFPC screenshot 1" /> -->
    </td>
  </tr>
</table>

## What It Does

### Chrome Extension

- Lets you enter file size, transfer type, upload speed, and download speed
- Calculates estimated transfer time
- Calculates total data usage with configurable protocol overhead
- Saves your last-used values with `chrome.storage`
- Uses the browser connection hint when available to prefill download speed

### GNOME Shell Extension

- Adds a top-bar indicator that shows live download and upload throughput
- Opens a menu-based calculator directly from the GNOME panel
- Uses current interface traffic from `/proc/net/dev`
- Estimates transfer time from the currently observed upload or download throughput
- Includes a compact, styled system-tray-like UI inside the shell menu

## Project Structure

```text
data_toolkit/
├── chrome-extension/
│   ├── icon.png
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── style.css
├── gnome-extension/
│   └── data-toolkit@local/
│       ├── extension.js
│       ├── metadata.json
│       └── stylesheet.css
└── README.md
```

## Chrome Extension Setup

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `chrome-extension` folder

## GNOME Extension Setup

GNOME Shell extensions require the extension directory name to match the UUID in `metadata.json`.

This project uses:

- UUID: `data-toolkit@local`
- Source folder: `gnome-extension/data-toolkit@local`

Install it locally with:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/data-toolkit@local
cp -r gnome-extension/data-toolkit@local/* ~/.local/share/gnome-shell/extensions/data-toolkit@local/
gnome-extensions enable data-toolkit@local
```

Then restart GNOME Shell:

- On X11, press `Alt+F2`, type `r`, and press Enter
- On Wayland, log out and sign back in

## Calculation Rules

- Input speed is treated as `Mbps`
- Transfer throughput is `Mbps / 8` to get `MB/s`
- Estimated time is `file_size_mb / speed_mb_per_sec`
- Estimated data includes overhead
- GNOME uses a fixed 5% overhead
- Chrome lets you adjust the overhead percentage

## Notes

- The Chrome extension does not run a full external speed test
- Chrome can sometimes expose a browser-level downlink estimate through the Network Information API, but upload speed usually still needs manual input
- The GNOME extension shows live throughput, which is different from a benchmark speed-test result
- If your network is idle, GNOME time estimates will reflect that low live traffic

## Developer Docs Used

This refactor follows the current extension models described in the official docs:

- GNOME extension structure and ES module guidance:
  https://gjs.guide/extensions/development/creating.html
- GNOME extension anatomy and `stylesheet.css` usage:
  https://gjs.guide/extensions/overview/anatomy.html
- GNOME popup menu and panel UI patterns:
  https://gjs.guide/extensions/topics/popup-menu.html
- Chrome extension manifest format:
  https://developer.chrome.com/extensions/manifest
- Chrome Manifest V3 overview:
  https://developer.chrome.com/docs/extensions/mv3/getstarted
- Chrome storage API:
  https://developer.chrome.com/docs/extensions/reference/storage

## Supported Scope

Supported:

- Chrome extension UI
- GNOME Shell top-bar utility
- Transfer time and data calculations

Removed:

- `data_toolkit.sh`
- `data_toolkit_tray.py`
