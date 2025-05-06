/**
 * This script automatically fixes incorrect import paths for 'authOptions'
 * It replaces relative paths like '../../auth/[...nextauth]/route' with '@/lib/auth'
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Recursive function to traverse directories
async function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      await traverseDirectory(fullPath);
    } else if (stat.isFile() && fullPath.endsWith('.ts') && !fullPath.includes('node_modules')) {
      await processFile(fullPath);
    }
  }
}

// Process each file to fix imports
async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Check for different patterns of incorrect imports
    const patterns = [
      /import\s+{\s*authOptions\s*}\s+from\s+["']\.\.\/\.\.\/auth\/\[\.\.\.\w+\]\/route["']/g,
      /import\s+{\s*authOptions\s*}\s+from\s+["']\.\.\/\.\.\/\.\.\/auth\/\[\.\.\.\w+\]\/route["']/g,
      /import\s+{\s*authOptions\s*}\s+from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/auth\/\[\.\.\.\w+\]\/route["']/g,
      /import\s+{\s*authOptions\s*}\s+from\s+["']\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/auth\/\[\.\.\.\w+\]\/route["']/g
    ];
    
    let hasChanges = false;
    let updatedContent = content;
    
    for (const pattern of patterns) {
      if (pattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(pattern, 'import { authOptions } from "@/lib/auth"');
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      await writeFile(filePath, updatedContent, 'utf8');
      console.log(`✅ Fixed imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error);
  }
}

// Main function
async function main() {
  const srcPath = path.join(__dirname, 'src');
  console.log('Starting to fix auth imports...');
  await traverseDirectory(srcPath);
  console.log('Finished fixing auth imports!');
}

main().catch(console.error); 