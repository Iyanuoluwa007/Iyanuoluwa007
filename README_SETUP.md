# Setup Guide - Iyanu's Robotics Arcade

This package is meant for your **GitHub profile repository**.

## 1) Create the profile repository
Create a **public** repository named exactly:

```text
Iyanuoluwa007
```

GitHub shows the `README.md` from that special public repository on your profile page. citeturn597409search0turn597409search10

## 2) Upload these files
Copy everything in this package into that repository.

## 3) Enable GitHub Actions
Go to the **Actions** tab and enable workflows for the repository.

The included `snake.yml` workflow uses Platane's `snk` action to generate contribution-grid SVGs. The marketplace page shows the current action line as `uses: Platane/snk@v3` and notes that it is a third-party action, not GitHub-certified. citeturn828681view0

## 4) Replace placeholder links
In `README.md`, replace these items if needed:

- `Add repo link` for your robot perception project
- `Add repo link` for Signlytic AI
- `Add repo link` for Quant Agent

## 5) Pin your best repositories
Suggested pinned order:

1. Autonomous Robot Perception
2. AutoResearcher
3. Signlytic AI
4. Quant Agent

## 6) Wait for the snake workflow
After the workflow runs, it will push these files to the `output` branch:

- `github-snake.svg`
- `github-snake-dark.svg`

Your profile README already points to those files.

## 7) Optional upgrades later
You can add later:

- GitHub stats card
- recent activity feed
- GitHub Pages mini-site
- project GIFs inside Boss Projects
