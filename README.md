# Ability Icon Modifier Builder

Generates composite ability icons with modifier overlays ready for use in Discord.

Each output image:

- Uses a base ability icon
- Adds a modifier icon in the top-left
- Applies a soft outline (black or white)
- Pins the ability icon bottom-right inside the canvas

## Folder Structure

```
abilities/        Base ability icons (.png or .webp)
icons/            Modifier icons (.png)
modifiers.json    Ability → modifier mapping
generate.js
```

Example modifiers.json:

```json
{
  "fireball": ["igneous", "poison"],
  "overpower": ["igneous"]
}
```

## Requirements

- Node.js (v18+ recommended)

## Installation

Clone the repository, then:

```bash
npm install
```

This installs the required dependency:

- sharp

## Run the Generator

```bash
node ./generate.js
```

Generated files will appear in `output/`

## Customisation

Edit these values in `generate.js`:

- `CANVAS_SIZE` – final output size
- `ABILITY_SIZE` – size of main icon inside canvas
- `OVERLAY_SIZE` – modifier icon size
- `OUTLINE_PROFILES` – control colour, thickness and blur
- `WHITE_OUTLINE_MODIFIERS` – which modifiers use white outlines instead of default black
