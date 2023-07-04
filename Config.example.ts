export const serverPort = 1337;

/**
 * this should be a github username for limit.
 * im lazy to create a secret token validation,
 * so i decided limiting my webhook by validating them based on the repository owner.
 */
export const ltdGitHubOwner = [];

/**
 * a list of a normal webhook (without /github at the end)
 * {
 *  "somerepopath": ["https://discord.com/api/webhooks/..."]
 * }
 */
export const webhookList: Record<string, string[]> = {};