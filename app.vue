<template>
  <NuxtPage />
</template>

<style>
:root {
  --bg: #faf7f2;
  --surface: #ffffff;
  --text: #1f1b16;
  --muted: #6b6258;
  --border: #e4ddd2;
  --accent: #b4532a;
  --accent-text: #ffffff;
  --warn-bg: #fff5e0;
  --warn-text: #7a4b00;
  --error-bg: #fde8e6;
  --error-text: #9b1c12;
  --note-highlight: #b4532a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17140f;
    --surface: #221e18;
    --text: #f2ece3;
    --muted: #a99f92;
    --border: #3a332a;
    --accent: #e07a4a;
    --accent-text: #17140f;
    --warn-bg: #3a2c10;
    --warn-text: #f5c770;
    --error-bg: #3d1915;
    --error-text: #ff9c90;
    --note-highlight: #e07a4a;
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
}
</style>
