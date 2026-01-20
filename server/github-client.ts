import { Octokit } from '@octokit/rest';
import { storage } from './storage';

/**
 * User-specific GitHub Integration
 * 
 * This module provides GitHub API access using per-user OAuth tokens
 * stored in the database. Each user connects their own GitHub account
 * through the OAuth flow (/api/auth/github).
 * 
 * Security model:
 * - Every function accepts userId
 * - Token is fetched from database per-request
 * - NO module-level state is shared between users
 */

async function getAccessToken(userId: string): Promise<string> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!user.githubAccessToken) {
    throw new Error('GitHub not connected. Please connect your GitHub account first.');
  }
  
  return user.githubAccessToken;
}

/**
 * Check if a user has GitHub connected
 */
export async function isGitHubConnected(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  return !!(user?.githubAccessToken);
}

/**
 * Get GitHub connection status for a user
 */
export async function getGitHubConnectionStatus(userId: string): Promise<{
  connected: boolean;
  username: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
}> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    return {
      connected: false,
      username: null,
      avatarUrl: null,
      connectedAt: null
    };
  }
  
  return {
    connected: !!user.githubAccessToken,
    username: user.githubUsername || null,
    avatarUrl: user.githubAvatarUrl || null,
    connectedAt: user.githubConnectedAt || null
  };
}

/**
 * Gets a fresh Octokit client for the specific user.
 * NEVER cache this client - it MUST be per-request and per-user.
 * 
 * @param userId - The ID of the user making the request
 * @returns A fresh Octokit client with user-specific credentials
 */
export async function getUncachableGitHubClient(userId: string) {
  const accessToken = await getAccessToken(userId);
  return new Octokit({ auth: accessToken });
}

export async function getGitHubUser(userId: string) {
  const octokit = await getUncachableGitHubClient(userId);
  const { data } = await octokit.rest.users.getAuthenticated();
  return data;
}

export async function listRepositories(userId: string) {
  const octokit = await getUncachableGitHubClient(userId);
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  });
  return data;
}

export async function getRepository(userId: string, owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient(userId);
  const { data } = await octokit.rest.repos.get({
    owner,
    repo
  });
  return data;
}

export async function listBranches(userId: string, owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient(userId);
  const { data } = await octokit.rest.repos.listBranches({
    owner,
    repo
  });
  return data;
}

export async function getFileContent(userId: string, owner: string, repo: string, path: string, ref?: string) {
  const octokit = await getUncachableGitHubClient(userId);
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref
    });
    
    if ('content' in data && data.type === 'file') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { content, sha: data.sha };
    }
    
    throw new Error('Path is not a file');
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createOrUpdateFile(
  userId: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
) {
  const octokit = await getUncachableGitHubClient(userId);
  const contentBase64 = Buffer.from(content).toString('base64');
  
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: contentBase64,
    branch,
    sha
  });
  
  return data;
}

export async function createBranch(userId: string, owner: string, repo: string, branchName: string, fromBranch: string = 'main') {
  const octokit = await getUncachableGitHubClient(userId);
  
  const { data: refData } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`
  });
  
  const { data } = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: refData.object.sha
  });
  
  return data;
}

export async function deleteBranch(userId: string, owner: string, repo: string, branchName: string) {
  const octokit = await getUncachableGitHubClient(userId);
  
  await octokit.rest.git.deleteRef({
    owner,
    repo,
    ref: `heads/${branchName}`
  });
}

export async function compareCommits(userId: string, owner: string, repo: string, base: string, head: string) {
  const octokit = await getUncachableGitHubClient(userId);
  
  const { data } = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base,
    head
  });
  
  return data;
}

export async function listCommits(userId: string, owner: string, repo: string, sha?: string, path?: string) {
  const octokit = await getUncachableGitHubClient(userId);
  
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    sha,
    path,
    per_page: 20
  });
  
  return data;
}
