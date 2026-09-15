#!/usr/bin/env node
/**
 * The version appears in four places that the MCP registry cross-checks at
 * publish time: package.json, server.json, the npm package entry and the OCI
 * image tag. A mismatch is only discovered when `mcp-publisher publish` rejects
 * the release, after npm has already been published and cannot be republished
 * at that version — so check before tagging, not after.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8'));

const pkg = read('package.json');
const server = read('server.json');
const problems = [];

if (pkg.version !== server.version) {
  problems.push(`package.json version ${pkg.version} != server.json version ${server.version}`);
}

if (pkg.mcpName !== server.name) {
  problems.push(`package.json mcpName "${pkg.mcpName}" != server.json name "${server.name}" (npm ownership check fails without an exact match)`);
}

const npmPackage = server.packages?.find((entry) => entry.registryType === 'npm');

if (npmPackage === undefined) {
  problems.push('server.json has no npm package entry');
} else {
  if (npmPackage.identifier !== pkg.name) {
    problems.push(`server.json npm identifier "${npmPackage.identifier}" != package.json name "${pkg.name}"`);
  }

  if (npmPackage.version !== pkg.version) {
    problems.push(`server.json npm package version ${npmPackage.version} != ${pkg.version}`);
  }
}

const ociPackage = server.packages?.find((entry) => entry.registryType === 'oci');

if (ociPackage !== undefined && !ociPackage.identifier.endsWith(`:${pkg.version}`)) {
  problems.push(`server.json oci identifier "${ociPackage.identifier}" is not tagged :${pkg.version}`);
}

// server.json advertises an image tag; the release workflow must actually push
// that exact string, or the registry step fails after npm has burned the version.
const release = readFileSync(fileURLToPath(new URL('../.github/workflows/release.yml', import.meta.url)), 'utf8');

if (ociPackage !== undefined) {
  const tag = ociPackage.identifier.slice(ociPackage.identifier.lastIndexOf(':') + 1);
  const publishesBareVersion = release.includes('${{ needs.version.outputs.version }}');

  if (tag === pkg.version && !publishesBareVersion) {
    problems.push('server.json advertises the bare version image tag, but release.yml does not push it');
  }
}

if (server.description.length > 100) {
  problems.push(`server.json description is ${server.description.length} characters; the registry schema caps it at 100`);
}

if (problems.length > 0) {
  for (const problem of problems) {
    process.stderr.write(`✗ ${problem}\n`);
  }

  process.exit(1);
}

process.stdout.write(`✓ manifests agree on ${server.name} ${pkg.version}\n`);
