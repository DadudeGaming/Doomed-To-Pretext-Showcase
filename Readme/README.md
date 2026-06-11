# Doomed-To-Pretext
Doom running on Pretext

## Overview

DTP is a browser based first person shooter game created using HTML, Pretext, and JavaScript. The game uses a raycasting engine to create a 3D environment and features enemy AI, shooting mechanics, health management, ammunition, and a minimap.

The objective is to survive for as long as possible and achieve the highest kill count before your health reaches zero.

## How to Run the Game

1. Open the project folder.
2. Open the HTML file in a modern web browser.
3. Click on the game window to lock the mouse cursor.
4. Play using the controls listed below.

## Controls

| Key/Mouse         | Action                  |
| ----------------- | ----------------------- |
| W                 | Move Forward            |
| S                 | Move Backward           |
| A                 | Move Left               |
| D                 | Move Right              |
| Mouse Movement    | Look Around             |
| Left Mouse Button | Shoot                   |
| Space             | Restart after Game Over |

## Gameplay

* Enemies will continuously spawn throughout the map.
* Defeat enemies by aiming at them and clicking to shoot.
* The player starts with limited ammunition.
* When ammunition reaches zero, the weapon automatically reloads.
* If enemies reach the player, they will deal damage.
* The game ends when the player's health reaches zero.
* Your goal is to survive and earn as many kills as possible.

## Features

* First-person 3D raycasting engine
* Text-based wall rendering
* Enemy AI and pathfinding
* Health and ammunition systems
* Automatic reloading
* Minimap
* Kill counter
* Game over screen and restart system

## Credits

### Text Layout Engine

* Pretext was used as a replacement for CSS. It has more accurate and faster text placement (and DOM) calculations built in, allowing for 3D interaction with text.

### AI Assistance

* ChatGPT was used to help with debugging (tracing code and reading error logs), code improvements (minor cleanup and explaining better ways to render 3D walls), and optimization (improve efficiency of my calculations).

### Images and Assets

* No external image assets were used.
* All graphics, wall text, HUD elements, and game objects are generated programmatically using JavaScript and the HTML5 Canvas.

### Additional Support

* Testing and feedback provided through personal experimentation and gameplay testing.

## Author

Created by Nicholas C

Course: IDC4U

Date: June 2026
