// src/api/seller/validate-paths.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Current directory:", __dirname);

// Test various paths
const pathsToCheck = [
  {
    name: "Data dir (relative):",
    path: "../../../data/seller"
  },
  {
    name: "Data dir (absolute):",
    path: path.join(__dirname, "../../../data/seller")
  },
  {
    name: "Current directory + 1 level up:",
    path: path.join(__dirname, "..")
  },
  {
    name: "Current directory + 2 levels up:",
    path: path.join(__dirname, "../..")
  },
  {
    name: "Current directory + 3 levels up:",
    path: path.join(__dirname, "../../..")
  }
];

// Check each path
pathsToCheck.forEach(({name, path: testPath}) => {
  console.log(`${name} ${testPath}`);
  try {
    if (fs.existsSync(testPath)) {
      console.log(`  EXISTS: ${path.resolve(testPath)}`);
      
      // If it exists, check if it's a directory
      const stats = fs.statSync(testPath);
      if (stats.isDirectory()) {
        console.log("  Is a directory");
        
        // List contents if it's a directory
        const contents = fs.readdirSync(testPath);
        console.log(`  Contents (${contents.length} items):`);
        contents.forEach(item => console.log(`    - ${item}`));
      } else {
        console.log("  Is a file");
      }
    } else {
      console.log(`  DOES NOT EXIST`);
      
      // Try to create the directory
      try {
        fs.mkdirSync(testPath, { recursive: true });
        console.log(`  Successfully created directory`);
      } catch (err) {
        console.log(`  Failed to create directory: ${err}`);
      }
    }
  } catch (err) {
    console.log(`  ERROR: ${err}`);
  }
  console.log("");
});

// Check if we have permission to write to the file system
try {
  const testFile = path.join(__dirname, 'test-write.txt');
  fs.writeFileSync(testFile, 'test content');
  console.log(`Successfully wrote to ${testFile}`);
  
  // Clean up
  fs.unlinkSync(testFile);
  console.log(`Successfully deleted ${testFile}`);
} catch (err) {
  console.log(`Error writing to file system: ${err}`);
}
