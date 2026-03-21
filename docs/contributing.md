# Contributing

Contributions are welcome. Please keep changes aligned with the existing architecture and UI patterns.

## Before you start

- This is a static web app, so changes usually land directly in HTML, CSS, or vanilla JavaScript.
- Modules are exposed on `window`, so new features should follow the current singleton pattern when appropriate.
- Cross-module communication should use custom events rather than direct coupling.

## Suggested workflow

1. Fork or branch from the main repository.
2. Make your changes in the smallest set of files possible.
3. Test the affected flows manually in a supported browser.
4. Verify local storage behavior if your change touches settings, commands, or themes.
5. Open a pull request with a short summary of what changed and why.

## Manual validation checklist

- Confirm the app loads over `localhost` or HTTPS.
- Confirm serial connection still works in a supported browser.
- Confirm settings persist after refresh.
- Confirm terminal rendering and plotter behavior still look correct.
- Confirm the browser console shows no new runtime errors.

## Contributor notes

- Preserve the zero-dependency approach unless there is a strong reason not to.
- Keep copy consistent with the actual app behavior.
- Prefer small, reviewable updates over broad rewrites when possible.

## Vibecoding requirement

All contributors: any code changes submitted via pull request MUST be produced using vibecoding. Manually typed or hand-crafted code is not allowed for PRs to this repository. By opening a PR you confirm the changes were generated with vibecoding.

Failure to follow this requirement may result in the PR being closed without review.
