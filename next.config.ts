import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS || false;
let repo = '';
if (isGithubActions && process.env.GITHUB_REPOSITORY) {
  const repoName = process.env.GITHUB_REPOSITORY.split('/')[1] || '';
  if (repoName && !repoName.endsWith('.github.io')) {
    repo = `/${repoName}`;
  }
}

const basePath = process.env.BASE_PATH || repo;

const nextConfig: NextConfig = {
  // The whole app runs in the browser, so `next build` writes a plain static site to `out/`.
  output: 'export',
  ...(basePath ? { basePath } : {}),
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
