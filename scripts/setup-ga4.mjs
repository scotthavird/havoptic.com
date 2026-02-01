#!/usr/bin/env node
/**
 * GA4 Setup Script
 *
 * Configures Google Analytics 4 property with key events and custom dimensions
 * for the Havoptic analytics tracking.
 *
 * Prerequisites:
 * 1. Create a Google Cloud project and enable the Google Analytics Admin API
 * 2. Create a service account with "Editor" role on your GA4 property
 * 3. Download the service account JSON key file
 * 4. Set GOOGLE_APPLICATION_CREDENTIALS env var to the key file path
 *
 * Usage:
 *   # Set up authentication
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
 *
 *   # Run the setup (dry run by default)
 *   node scripts/setup-ga4.mjs --property=YOUR_PROPERTY_ID
 *
 *   # Actually apply changes
 *   node scripts/setup-ga4.mjs --property=YOUR_PROPERTY_ID --apply
 *
 * To find your GA4 Property ID:
 *   Go to GA4 Admin > Property Settings > Property ID (e.g., 123456789)
 */

import { AnalyticsAdminServiceClient } from '@google-analytics/admin';

// =============================================================================
// Configuration: Events and Dimensions to Set Up
// =============================================================================

/**
 * Key Events (Conversions)
 * These are important events that should be marked as conversions in GA4.
 */
const KEY_EVENTS = [
  {
    eventName: 'newsletter_success',
    countingMethod: 'ONCE_PER_EVENT',
    description: 'Newsletter signup conversion - primary conversion goal',
  },
];

/**
 * Custom Dimensions
 * Event-scoped dimensions for better analysis and reporting.
 */
const CUSTOM_DIMENSIONS = [
  {
    parameterName: 'tool_name',
    displayName: 'Tool Name',
    description: 'The AI coding tool (e.g., claude-code, cursor, gemini-cli)',
    scope: 'EVENT',
  },
  {
    parameterName: 'event_category',
    displayName: 'Event Category',
    description: 'Category of the event (newsletter, outbound, engagement)',
    scope: 'EVENT',
  },
  {
    parameterName: 'version',
    displayName: 'Tool Version',
    description: 'Version number of the release being viewed',
    scope: 'EVENT',
  },
  {
    parameterName: 'method',
    displayName: 'Share Method',
    description: 'Method used for sharing (twitter, linkedin, copy, etc.)',
    scope: 'EVENT',
  },
  {
    parameterName: 'link_url',
    displayName: 'Link URL',
    description: 'URL of outbound links clicked',
    scope: 'EVENT',
  },
  {
    parameterName: 'percent_scrolled',
    displayName: 'Scroll Depth Percentage',
    description: 'How far down the page the user scrolled',
    scope: 'EVENT',
  },
];

/**
 * Custom Metrics
 * Numeric metrics for aggregation.
 */
const CUSTOM_METRICS = [
  // Currently no custom metrics needed, but structure is here for future use
];

// =============================================================================
// Script Implementation
// =============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    propertyId: null,
    apply: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--apply') {
      options.apply = true;
    } else if (arg.startsWith('--property=')) {
      options.propertyId = arg.split('=')[1];
    }
  }

  return options;
}

function printHelp() {
  console.log(`
GA4 Setup Script - Configure Google Analytics 4 for Havoptic

Usage:
  node scripts/setup-ga4.mjs --property=PROPERTY_ID [--apply]

Options:
  --property=ID   GA4 Property ID (required, e.g., 123456789)
  --apply         Actually apply changes (default is dry run)
  --help, -h      Show this help message

Environment Variables:
  GOOGLE_APPLICATION_CREDENTIALS  Path to service account JSON key file

Setup Instructions:
  1. Go to Google Cloud Console: https://console.cloud.google.com
  2. Create or select a project
  3. Enable "Google Analytics Admin API"
  4. Go to IAM & Admin > Service Accounts
  5. Create a service account
  6. Download the JSON key file
  7. In GA4 Admin, add the service account email as an Editor
  8. Set the environment variable and run this script

Example:
  export GOOGLE_APPLICATION_CREDENTIALS=./ga4-service-account.json
  node scripts/setup-ga4.mjs --property=123456789 --apply
`);
}

async function listExistingKeyEvents(client, propertyPath) {
  try {
    const [keyEvents] = await client.listKeyEvents({ parent: propertyPath });
    return keyEvents || [];
  } catch (error) {
    // v1beta might not have listKeyEvents, try conversionEvents
    try {
      const [conversionEvents] = await client.listConversionEvents({ parent: propertyPath });
      return conversionEvents || [];
    } catch {
      console.warn('  Could not list existing key events');
      return [];
    }
  }
}

async function listExistingCustomDimensions(client, propertyPath) {
  try {
    const [dimensions] = await client.listCustomDimensions({ parent: propertyPath });
    return dimensions || [];
  } catch (error) {
    console.warn('  Could not list existing custom dimensions:', error.message);
    return [];
  }
}

async function createKeyEvent(client, propertyPath, eventConfig, dryRun) {
  const { eventName, countingMethod, description } = eventConfig;

  console.log(`\n  Creating key event: ${eventName}`);
  console.log(`    Counting method: ${countingMethod}`);
  console.log(`    Description: ${description}`);

  if (dryRun) {
    console.log('    [DRY RUN] Would create key event');
    return;
  }

  try {
    // Try the newer KeyEvent API first
    await client.createKeyEvent({
      parent: propertyPath,
      keyEvent: {
        eventName,
        countingMethod: `CONVERSION_COUNTING_METHOD_${countingMethod}`,
      },
    });
    console.log('    ✓ Created key event');
  } catch (error) {
    // Fall back to ConversionEvent API
    try {
      await client.createConversionEvent({
        parent: propertyPath,
        conversionEvent: {
          eventName,
          countingMethod: `CONVERSION_COUNTING_METHOD_${countingMethod}`,
        },
      });
      console.log('    ✓ Created conversion event (legacy API)');
    } catch (fallbackError) {
      console.error(`    ✗ Failed to create: ${fallbackError.message}`);
    }
  }
}

async function createCustomDimension(client, propertyPath, dimConfig, dryRun) {
  const { parameterName, displayName, description, scope } = dimConfig;

  console.log(`\n  Creating custom dimension: ${displayName}`);
  console.log(`    Parameter: ${parameterName}`);
  console.log(`    Scope: ${scope}`);
  console.log(`    Description: ${description}`);

  if (dryRun) {
    console.log('    [DRY RUN] Would create custom dimension');
    return;
  }

  try {
    await client.createCustomDimension({
      parent: propertyPath,
      customDimension: {
        parameterName,
        displayName,
        description,
        scope: scope,
      },
    });
    console.log('    ✓ Created custom dimension');
  } catch (error) {
    if (error.message?.includes('already exists')) {
      console.log('    ○ Already exists, skipping');
    } else {
      console.error(`    ✗ Failed to create: ${error.message}`);
    }
  }
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.propertyId) {
    console.error('Error: --property=PROPERTY_ID is required\n');
    printHelp();
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set\n');
    console.error('Set it to the path of your service account JSON key file:');
    console.error('  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json\n');
    process.exit(1);
  }

  const propertyPath = `properties/${options.propertyId}`;
  const dryRun = !options.apply;

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           GA4 Setup Script for Havoptic                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Property: ${propertyPath}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (use --apply to make changes)' : 'APPLYING CHANGES'}`);
  console.log();

  // Initialize the client
  const client = new AnalyticsAdminServiceClient();

  // Verify property access
  console.log('Verifying property access...');
  try {
    const [property] = await client.getProperty({ name: propertyPath });
    console.log(`  ✓ Connected to: ${property.displayName}`);
  } catch (error) {
    console.error(`  ✗ Cannot access property: ${error.message}`);
    console.error('\nMake sure:');
    console.error('  1. The property ID is correct');
    console.error('  2. The service account has Editor access to this property');
    process.exit(1);
  }

  // List existing key events
  console.log('\nChecking existing key events...');
  const existingKeyEvents = await listExistingKeyEvents(client, propertyPath);
  const existingEventNames = new Set(existingKeyEvents.map(e => e.eventName));
  console.log(`  Found ${existingKeyEvents.length} existing key events`);

  // List existing custom dimensions
  console.log('\nChecking existing custom dimensions...');
  const existingDimensions = await listExistingCustomDimensions(client, propertyPath);
  const existingDimParams = new Set(existingDimensions.map(d => d.parameterName));
  console.log(`  Found ${existingDimensions.length} existing custom dimensions`);

  // Create key events
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('Setting up Key Events (Conversions)');
  console.log('─────────────────────────────────────────────────────────────────');

  for (const eventConfig of KEY_EVENTS) {
    if (existingEventNames.has(eventConfig.eventName)) {
      console.log(`\n  ○ Key event "${eventConfig.eventName}" already exists, skipping`);
    } else {
      await createKeyEvent(client, propertyPath, eventConfig, dryRun);
    }
  }

  // Create custom dimensions
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('Setting up Custom Dimensions');
  console.log('─────────────────────────────────────────────────────────────────');

  for (const dimConfig of CUSTOM_DIMENSIONS) {
    if (existingDimParams.has(dimConfig.parameterName)) {
      console.log(`\n  ○ Dimension "${dimConfig.displayName}" already exists, skipping`);
    } else {
      await createCustomDimension(client, propertyPath, dimConfig, dryRun);
    }
  }

  // Summary
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('Setup Complete!');
  console.log('═════════════════════════════════════════════════════════════════');

  if (dryRun) {
    console.log('\nThis was a DRY RUN. To apply changes, run:');
    console.log(`  node scripts/setup-ga4.mjs --property=${options.propertyId} --apply`);
  } else {
    console.log('\nChanges have been applied to your GA4 property.');
    console.log('\nNext steps:');
    console.log('  1. Go to GA4 Admin > Events to verify events appear');
    console.log('  2. Go to GA4 Admin > Custom definitions to verify dimensions');
    console.log('  3. Events will start appearing once tracking code sends them');
  }

  console.log('\n📊 Events being tracked:');
  console.log('  • page_view - SPA navigation');
  console.log('  • newsletter_form_view - Form visibility');
  console.log('  • newsletter_submit - Form submissions');
  console.log('  • newsletter_success - Successful signups (KEY EVENT)');
  console.log('  • newsletter_error - Subscription errors');
  console.log('  • newsletter_dismiss - Form dismissals');
  console.log('  • click (outbound) - External link clicks');
  console.log('  • infographic_zoom - Infographic interactions');
  console.log('  • share - Content sharing');
  console.log('  • tool_filter_click - Filter interactions');
  console.log('  • release_link_click - Release link clicks');
  console.log('  • scroll_depth - Scroll engagement');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
