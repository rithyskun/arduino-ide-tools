#!/bin/bash

# Device-Driven Simulator Test Setup Script
# This script helps you quickly set up the test project

echo "🚀 Setting up Device-Driven Simulator Test..."
echo ""

# Check if project directory exists
if [ ! -d "test-project" ]; then
    echo "📁 Creating test project directory..."
    mkdir -p test-project
fi

# Copy test files
echo "📋 Copying test files..."
cp test-project-files/main.ino test-project/
cp test-project-files/__devices.json test-project/

echo "✅ Test project setup complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Open the Arduino IDE"
echo "2. Create a new project or open existing one"
echo "3. Copy the files from 'test-project/' directory to your project"
echo "4. Click 'Compile & Run'"
echo "5. Watch for device-driven simulator messages in serial monitor"
echo ""
echo "📖 See setup-device-driven-test.md for detailed instructions"
echo ""
echo "🎉 Expected: 'Using device-driven simulator' message in compile log"
