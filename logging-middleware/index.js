require('dotenv').config();

const DEFAULT_BASE_URL = 'http://4.224.186.213/evaluation-service';

const VALID_STACKS = new Set(['backend', 'frontend']);
const VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal']);

let cachedToken = null;
let tokenExpiry = 0;

function credentialsFromEnv() {
  return {
    baseURL: process.env.EVALUATION_BASE_URL || DEFAULT_BASE_URL,
    email: process.env.EVALUATION_EMAIL || '',
    name: process.env.EVALUATION_NAME || '',
    rollNo: process.env.EVALUATION_ROLL_NO || '',
    clientID: process.env.EVALUATION_CLIENT_ID || '',
    clientSecret: process.env.EVALUATION_CLIENT_SECRET || '',
  };
}

function credentialsValid(creds) {
  return Boolean(
    creds.email &&
      creds.name &&
      creds.rollNo &&
      creds.clientID &&
      creds.clientSecret
  );
}

async function getAccessToken(creds = credentialsFromEnv()) {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!credentialsValid(creds)) {
    throw new Error(
      'Missing evaluation credentials: set EVALUATION_EMAIL, EVALUATION_NAME, EVALUATION_ROLL_NO, EVALUATION_CLIENT_ID, EVALUATION_CLIENT_SECRET'
    );
  }

  const response = await fetch(`${creds.baseURL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: creds.email,
      name: creds.name,
      rollNo: creds.rollNo,
      clientID: creds.clientID,
      clientSecret: creds.clientSecret,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Auth failed (${response.status}): ${body}`);
  }

  const data = JSON.parse(body);
  if (!data.access_token) {
    throw new Error('Auth response missing access_token');
  }

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  return cachedToken;
}

/**
 * Log(stack, level, package, message)
 * Sends structured logs to the evaluation-service.
 */
async function Log(stack, level, packageName, message) {
  const normalizedStack = String(stack).toLowerCase();
  const normalizedLevel = String(level).toLowerCase();
  const normalizedPackage = String(packageName).toLowerCase();

  if (!VALID_STACKS.has(normalizedStack)) {
    throw new Error(`invalid stack "${stack}": must be backend or frontend`);
  }
  if (!VALID_LEVELS.has(normalizedLevel)) {
    throw new Error(`invalid level "${level}"`);
  }
  if (!normalizedPackage) {
    throw new Error('package name is required');
  }
  if (!message) {
    throw new Error('message is required');
  }

  const creds = credentialsFromEnv();
  const token = await getAccessToken(creds);

  const response = await fetch(`${creds.baseURL}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      stack: normalizedStack,
      level: normalizedLevel,
      package: normalizedPackage,
      message: String(message),
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Log failed (${response.status}): ${body}`);
  }
}

function LogSafe(stack, level, packageName, message) {
  Log(stack, level, packageName, message).catch(() => {});
}

module.exports = {
  Log,
  LogSafe,
  getAccessToken,
  credentialsFromEnv,
  credentialsValid,
};
