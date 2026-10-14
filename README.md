# WME Show Alt Names

A Tampermonkey userscript for the [Waze Map Editor (WME)](https://www.waze.com/editor) that displays alternate street names for selected road segments in an interactive overlay panel.

Originally created by **SAR85** and **The_Cre8r**, currently maintained by **kid4rm90s**.

---

## Features

- Displays a floating panel listing all selected segments with their **primary name**, **alternate (alt) names**, **road type**, **segment ID**, and **length**.
- **Color-coded road types** (Street, Primary Street, Freeway, Ramp, etc.) for quick visual identification.
- **Map layer highlighting** — hovering over a row highlights the corresponding segment on the map.
- **Click to pan** — clicking a row centers the map on that segment.
- **Click to select** — double-clicking a row selects the segment in WME.
- **Randomized highlight colors** per unique street name for easy differentiation.
- Option to **group segments by city** (toggle "Use City" checkbox) when coloring by name.
- Draggable panel (with fallback for unsupported browsers).
- Auto-updates via Greasy Fork.
- Built on the **WME SDK** (async mode) for improved performance and reliability.

---

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Install the script directly from Greasy Fork:  
   **[WME Show Alt Names on Greasy Fork](https://greasyfork.org/scripts/574195-wme-show-alt-names)**
3. Open the [Waze Map Editor](https://www.waze.com/editor). The script will load automatically.

---

## Usage

1. Open the Waze Map Editor.
2. Select one or more road segments on the map.
3. A floating panel will appear in the lower-left corner listing the segment(s) with their primary and alternate names.
4. **Hover** over a row to highlight the segment on the map.
5. **Click** a row to pan the map to that segment.
6. **Double-click** a row to select the segment in WME.
7. **Right-click** a colored name cell to randomize its highlight color.
8. Use the **Options** button to toggle city-based grouping and other display settings.

---

## Road Type Reference

| Code | Abbreviation | Type |
|------|-------------|------|
| 1 | St | Street |
| 2 | PS | Primary Street |
| 3 | Fwy | Freeway |
| 4 | Rmp | Ramp |
| 5 | Trl | Trail |
| 6 | MH | Major Highway |
| 7 | mH | Minor Highway |
| 8 | Dirt | Dirt Road |
| 10 | Bdwk | Boardwalk |
| 16 | Stwy | Stairway |
| 17 | Pvt | Private Road |
| 18 | RR | Railroad |
| 19 | Rwy | Runway |
| 20 | PLR | Parking Lot Road |

---

## Compatibility

- **Browser:** Chrome, Firefox, Edge (with Tampermonkey)
- **WME URL:** `https://www.waze.com/editor` and `https://beta.waze.com/editor`

---

## Credits

| Role | Name |
|------|------|
| Original Authors | SAR85, The_Cre8r |
| Current Maintainer | kid4rm90s |

---

## License

[CC BY-NC-ND](https://creativecommons.org/licenses/by-nc-nd/4.0/) — Attribution, Non-Commercial, No Derivatives.

---

## Links

- [Greasy Fork Page](https://greasyfork.org/scripts/574195-wme-show-alt-names)
- [Feedback / Bug Reports](https://greasyfork.org/scripts/574195-wme-show-alt-names/feedback)
- [Download Latest](https://update.greasyfork.org/scripts/574195/WME%20Show%20Alt%20Names.user.js)
