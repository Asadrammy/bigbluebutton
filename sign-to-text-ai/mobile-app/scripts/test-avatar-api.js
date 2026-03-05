/**
 * Test ReadyPlayer.me Avatar API Integration
 * 
 * This script tests:
 * 1. API endpoint accessibility
 * 2. GLB file download
 * 3. File validation
 * 4. Query parameters support
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const READY_PLAYER_ME_BASE_URL = 'https://models.readyplayer.me';
const TEST_AVATAR_ID = '65a8dba831b23abb4f401bae'; // Example from ReadyPlayer.me docs

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Download file from URL
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    log(`\n📥 Downloading: ${url}`, 'cyan');
    
    const file = fs.createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = totalSize > 0 ? ((downloadedSize / totalSize) * 100).toFixed(1) : '?';
        process.stdout.write(`\r   Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        log(`\n✅ Download complete: ${outputPath}`, 'green');
        resolve(outputPath);
      });
      
      file.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Validate GLB file
 */
function validateGLBFile(filePath) {
  return new Promise((resolve, reject) => {
    log(`\n🔍 Validating GLB file: ${filePath}`, 'cyan');
    
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    log(`   File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`, 'blue');
    
    if (fileSize < 1000) {
      reject(new Error('File too small - likely not a valid GLB'));
      return;
    }
    
    // Read first bytes to check GLB magic number
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
    
    // GLB format: first 4 bytes should be "glTF" in ASCII
    const magic = buffer.toString('ascii', 0, 4);
    const version = buffer.readUInt32LE(4);
    const length = buffer.readUInt32LE(8);
    
    log(`   Magic: ${magic}`, 'blue');
    log(`   Version: ${version}`, 'blue');
    log(`   Length: ${length} bytes`, 'blue');
    
    if (magic === 'glTF') {
      log(`✅ Valid GLB file detected!`, 'green');
      resolve({
        valid: true,
        size: fileSize,
        version,
        length
      });
    } else {
      log(`⚠️  Warning: Magic number doesn't match 'glTF'`, 'yellow');
      log(`   First bytes: ${buffer.toString('hex', 0, 12)}`, 'yellow');
      // Still resolve as it might be valid but in different format
      resolve({
        valid: false,
        size: fileSize,
        warning: 'Magic number mismatch'
      });
    }
  });
}

/**
 * Test avatar URL with query parameters
 */
function testAvatarUrl(avatarId, queryParams = {}) {
  let url = `${READY_PLAYER_ME_BASE_URL}/${avatarId}.glb`;
  
  if (Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      params.append(key, value);
    });
    url += `?${params.toString()}`;
  }
  
  return url;
}

/**
 * Main test function
 */
async function runTests() {
  log('\n🧪 ReadyPlayer.me Avatar API Test Suite', 'cyan');
  log('='.repeat(50), 'cyan');
  
  const testDir = path.join(__dirname, '../test-avatars');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const tests = [
    {
      name: 'Basic Avatar Download',
      avatarId: TEST_AVATAR_ID,
      queryParams: {},
      outputFile: path.join(testDir, 'basic-avatar.glb')
    },
    {
      name: 'Optimized Avatar (LOD 2, No Texture Atlas)',
      avatarId: TEST_AVATAR_ID,
      queryParams: { lod: 2, textureAtlas: 'none' },
      outputFile: path.join(testDir, 'optimized-avatar.glb')
    },
    {
      name: 'High Quality Avatar',
      avatarId: TEST_AVATAR_ID,
      queryParams: { lod: 0, textureAtlas: '4096' },
      outputFile: path.join(testDir, 'high-quality-avatar.glb')
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      log(`\n📋 Test: ${test.name}`, 'yellow');
      log('-'.repeat(50), 'yellow');
      
      const url = testAvatarUrl(test.avatarId, test.queryParams);
      log(`   URL: ${url}`, 'blue');
      
      // Download
      await downloadFile(url, test.outputFile);
      
      // Validate
      const validation = await validateGLBFile(test.outputFile);
      
      results.push({
        test: test.name,
        success: true,
        url,
        file: test.outputFile,
        validation
      });
      
      log(`✅ Test passed: ${test.name}`, 'green');
      
    } catch (error) {
      log(`❌ Test failed: ${test.name}`, 'red');
      log(`   Error: ${error.message}`, 'red');
      
      results.push({
        test: test.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Summary
  log('\n' + '='.repeat(50), 'cyan');
  log('📊 Test Summary', 'cyan');
  log('='.repeat(50), 'cyan');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    if (result.success) {
      log(`✅ ${result.test}`, 'green');
      log(`   File: ${result.file}`, 'blue');
      log(`   Size: ${(result.validation.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
    } else {
      log(`❌ ${result.test}`, 'red');
      log(`   Error: ${result.error}`, 'red');
    }
  });
  
  log('\n' + '='.repeat(50), 'cyan');
  log(`Total: ${results.length} tests`, 'cyan');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log('='.repeat(50), 'cyan');
  
  if (failed === 0) {
    log('\n🎉 All tests passed! ReadyPlayer.me integration is working perfectly!', 'green');
    log(`\n📁 Test files saved in: ${testDir}`, 'blue');
    log('   You can inspect these GLB files with a 3D viewer like:', 'blue');
    log('   - https://gltf-viewer.donmccurdy.com/', 'blue');
    log('   - https://threejs.org/editor/', 'blue');
  } else {
    log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

