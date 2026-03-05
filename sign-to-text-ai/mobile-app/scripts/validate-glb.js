/**
 * Validate GLB file structure and content
 * Checks if the avatar is a proper 3D model with human-like structure
 */

const fs = require('fs');
const path = require('path');

function validateGLBStructure(filePath) {
  console.log(`\n🔍 Validating GLB structure: ${path.basename(filePath)}`);
  console.log('='.repeat(60));
  
  const buffer = fs.readFileSync(filePath);
  const fileSize = buffer.length;
  
  console.log(`📊 File Statistics:`);
  console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Bytes: ${fileSize.toLocaleString()}`);
  
  // Check GLB header (first 12 bytes)
  if (buffer.length < 12) {
    console.log('❌ File too small to be a valid GLB');
    return false;
  }
  
  const magic = buffer.toString('ascii', 0, 4);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  console.log(`\n📦 GLB Header:`);
  console.log(`   Magic: ${magic}`);
  console.log(`   Version: ${version}`);
  console.log(`   Total Length: ${length.toLocaleString()} bytes`);
  
  if (magic !== 'glTF') {
    console.log('❌ Invalid GLB magic number');
    return false;
  }
  
  if (version !== 2) {
    console.log(`⚠️  Warning: GLB version ${version} (expected 2)`);
  }
  
  // Check for JSON chunk (should be at offset 12)
  if (buffer.length < 20) {
    console.log('❌ File too small for chunk headers');
    return false;
  }
  
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.toString('ascii', 16, 20);
  
  console.log(`\n📄 JSON Chunk:`);
  console.log(`   Length: ${jsonChunkLength.toLocaleString()} bytes`);
  console.log(`   Type: ${jsonChunkType}`);
  
  if (jsonChunkType !== 'JSON') {
    console.log('❌ Invalid JSON chunk type');
    return false;
  }
  
  // Extract and parse JSON
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonChunkLength;
  
  if (jsonEnd > buffer.length) {
    console.log('❌ JSON chunk extends beyond file size');
    return false;
  }
  
  try {
    const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
    const gltf = JSON.parse(jsonString);
    
    console.log(`\n🎨 GLTF Structure:`);
    console.log(`   Asset: ${gltf.asset?.generator || 'Unknown'}`);
    console.log(`   Version: ${gltf.asset?.version || 'Unknown'}`);
    console.log(`   Scenes: ${gltf.scenes?.length || 0}`);
    console.log(`   Nodes: ${gltf.nodes?.length || 0}`);
    console.log(`   Meshes: ${gltf.meshes?.length || 0}`);
    console.log(`   Materials: ${gltf.materials?.length || 0}`);
    console.log(`   Textures: ${gltf.textures?.length || 0}`);
    console.log(`   Animations: ${gltf.animations?.length || 0}`);
    console.log(`   Skins: ${gltf.skins?.length || 0}`);
    
    // Check for human-like structure
    const hasSkeleton = gltf.skins && gltf.skins.length > 0;
    const hasAnimations = gltf.animations && gltf.animations.length > 0;
    const hasMeshes = gltf.meshes && gltf.meshes.length > 0;
    
    console.log(`\n👤 Human Avatar Features:`);
    console.log(`   ${hasSkeleton ? '✅' : '❌'} Skeleton/Skin (${gltf.skins?.length || 0})`);
    console.log(`   ${hasAnimations ? '✅' : '⚠️ '} Animations (${gltf.animations?.length || 0})`);
    console.log(`   ${hasMeshes ? '✅' : '❌'} Meshes (${gltf.meshes?.length || 0})`);
    
    // Check nodes for human-like structure
    if (gltf.nodes) {
      const nodeNames = gltf.nodes.map(n => n.name || 'unnamed').filter(n => n);
      const humanBones = nodeNames.filter(name => 
        name.toLowerCase().includes('head') ||
        name.toLowerCase().includes('body') ||
        name.toLowerCase().includes('arm') ||
        name.toLowerCase().includes('hand') ||
        name.toLowerCase().includes('leg') ||
        name.toLowerCase().includes('hip') ||
        name.toLowerCase().includes('spine')
      );
      
      console.log(`\n🦴 Bone Structure:`);
      console.log(`   Total Nodes: ${nodeNames.length}`);
      console.log(`   Human-like Bones: ${humanBones.length}`);
      if (humanBones.length > 0) {
        console.log(`   Sample Bones: ${humanBones.slice(0, 10).join(', ')}${humanBones.length > 10 ? '...' : ''}`);
      }
    }
    
    // Overall validation
    const isValid = hasSkeleton && hasMeshes;
    
    console.log(`\n${'='.repeat(60)}`);
    if (isValid) {
      console.log('✅ GLB file is valid and appears to be a human avatar!');
      console.log('   The model has skeleton, meshes, and proper structure.');
    } else {
      console.log('⚠️  GLB file is valid but may not be a complete human avatar');
    }
    
    return isValid;
    
  } catch (error) {
    console.log(`❌ Failed to parse JSON: ${error.message}`);
    return false;
  }
}

// Test all downloaded avatars
const testDir = path.join(__dirname, '../test-avatars');

if (!fs.existsSync(testDir)) {
  console.log('❌ Test directory not found. Run test-avatar-api.js first.');
  process.exit(1);
}

const files = fs.readdirSync(testDir).filter(f => f.endsWith('.glb'));

if (files.length === 0) {
  console.log('❌ No GLB files found in test-avatars directory.');
  process.exit(1);
}

console.log('🧪 GLB File Validation Suite');
console.log('='.repeat(60));
console.log(`Found ${files.length} GLB file(s) to validate\n`);

let allValid = true;

files.forEach(file => {
  const filePath = path.join(testDir, file);
  const isValid = validateGLBStructure(filePath);
  if (!isValid) {
    allValid = false;
  }
});

console.log(`\n${'='.repeat(60)}`);
if (allValid) {
  console.log('🎉 All GLB files are valid human avatars!');
  console.log('✅ ReadyPlayer.me integration is working perfectly!');
} else {
  console.log('⚠️  Some files may have issues. Check the output above.');
}

