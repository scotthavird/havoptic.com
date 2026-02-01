#!/usr/bin/env node
/**
 * Generate VAPID Keys for Web Push
 *
 * This script generates a new VAPID key pair for Web Push notifications.
 * Run this once and add the keys to your Terraform variables or Cloudflare secrets.
 *
 * Usage: node scripts/generate-vapid-keys.mjs
 */

import { webcrypto } from 'crypto';

const { subtle } = webcrypto;

// Convert ArrayBuffer to base64url
function arrayBufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  const base64 = Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateVapidKeys() {
  // Generate an ECDSA key pair on the P-256 curve
  const keyPair = await subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['sign', 'verify']
  );

  // Export public key in raw format (65 bytes for uncompressed P-256)
  const publicKeyRaw = await subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyBase64url = arrayBufferToBase64url(publicKeyRaw);

  // Export private key in PKCS8 format
  const privateKeyPkcs8 = await subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyBase64url = arrayBufferToBase64url(privateKeyPkcs8);

  console.log('\n=== VAPID Keys Generated ===\n');
  console.log('Add these to your Terraform variables or Cloudflare Pages secrets:\n');

  console.log('VAPID_PUBLIC_KEY (not sensitive, safe to expose to clients):');
  console.log(publicKeyBase64url);
  console.log();

  console.log('VAPID_PRIVATE_KEY (KEEP SECRET, never expose to clients):');
  console.log(privateKeyBase64url);
  console.log();

  console.log('For Terraform (terraform.tfvars):');
  console.log(`vapid_public_key  = "${publicKeyBase64url}"`);
  console.log(`vapid_private_key = "${privateKeyBase64url}"`);
  console.log();
}

generateVapidKeys().catch(console.error);
