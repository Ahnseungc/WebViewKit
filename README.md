# WebView Monorepo

A monorepo containing WebView-related packages.

## Packages

- `@webview/core`: Core WebView functionality

## Development

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build all packages:
   ```bash
   pnpm build
   ```

3. Run tests:
   ```bash
   pnpm test
   ```

4. Run linting:
   ```bash
   pnpm lint
   ```

## Adding a New Package

1. Create a new directory in `packages/`
2. Initialize the package with `pnpm init`
3. Add necessary dependencies
4. Update the package.json with appropriate scripts and configuration

## License

MIT 