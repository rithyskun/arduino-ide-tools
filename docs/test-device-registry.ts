/**
 * Test script to verify device registry is working
 * Run this in the browser console to debug device registration
 */

import { DeviceRegistry } from '@/lib/simulator/device-driven-simulator';
import '@/lib/simulator/devices'; // Import to register devices

// Test device registry
console.log('Testing Device Registry...');
console.log('Registered device types:', DeviceRegistry.getRegisteredTypes());

// Test creating each device type
const deviceTypes = ['dht22', 'stepper', 'lcd1602'];
deviceTypes.forEach(type => {
  const device = DeviceRegistry.create(type);
  console.log(`Creating ${type}:`, device ? '✓ Success' : '✗ Failed');
  if (device) {
    console.log(`  - Device ID: ${device.deviceId}`);
    console.log(`  - Device Type: ${device.deviceType}`);
    console.log(`  - Category: ${device.category}`);
  }
});

export { DeviceRegistry };
