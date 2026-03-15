/**
 * Seed script
 * Run: npx ts-node --skip-project scripts/seed.ts
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '.env.local' });

function demoFile(boardName: string): object {
  return {
    name: 'main.ino',
    language: 'cpp',
    readonly: false,
    content: `// ${boardName} Demo\n// Replace with your own code or import files via the toolbar.\n\nconst int LED_PIN  = 13;\nconst int BLINK_MS = 500;\nunsigned long lastMs = 0;\nbool ledState = false;\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(LED_PIN, OUTPUT);\n  Serial.println("<Inf> ${boardName} ready.");\n}\n\nvoid loop() {\n  unsigned long now = millis();\n  if (now - lastMs >= BLINK_MS) {\n    lastMs   = now;\n    ledState = !ledState;\n    digitalWrite(LED_PIN, ledState ? HIGH : LOW);\n    Serial.print("<Data> t=");\n    Serial.print(now);\n    Serial.print(", led=");\n    Serial.println(ledState ? "ON" : "OFF");\n  }\n}\n`,
  };
}

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected');

  const { User } = await import('../lib/models/User');
  const { Project } = await import('../lib/models/Project');

  const seedEmails = ['admin@arduinosim.dev', 'demo@arduinosim.dev'];
  const existing = await User.find({ email: { $in: seedEmails } }).select(
    '_id'
  );
  await Project.deleteMany({ owner: { $in: existing.map((u) => u._id) } });
  await User.deleteMany({ email: { $in: seedEmails } });
  console.log('Cleared existing seed data');

  const admin = await User.create({
    email: 'admin@arduinosim.dev',
    username: 'admin',
    passwordHash: 'Admin123',
    displayName: 'Admin',
    role: 'admin',
    emailVerified: true,
  });

  const demo = await User.create({
    email: 'demo@arduinosim.dev',
    username: 'demo_user',
    passwordHash: 'Demo1234',
    displayName: 'Demo User',
    emailVerified: true,
  });

  await Project.insertMany([
    {
      owner: demo._id,
      name: 'MEGA Blink',
      boardId: 'arduino-mega',
      tags: ['mega', 'blink'],
      files: [demoFile('Arduino MEGA 2560')],
    },
    {
      owner: demo._id,
      name: 'UNO Blink',
      boardId: 'arduino-uno',
      tags: ['uno', 'blink'],
      files: [demoFile('Arduino UNO')],
    },
    {
      owner: admin._id,
      name: 'ESP32 Demo',
      boardId: 'esp32',
      tags: ['esp32', 'blink'],
      files: [demoFile('ESP32 DevKit')],
      isPublic: true,
    },
  ]);

  await User.updateOne({ _id: demo._id }, { 'stats.projectCount': 2 });
  await User.updateOne({ _id: admin._id }, { 'stats.projectCount': 1 });

  console.log('\n Seed complete!');
  console.log('  admin@arduinosim.dev / Admin123 (admin)');
  console.log('  demo@arduinosim.dev  / Demo1234 (user)');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
