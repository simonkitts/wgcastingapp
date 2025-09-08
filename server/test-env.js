// Test script to verify environment variables
require('dotenv').config();

console.log('Environment variables test:');
console.log('JSONBIN_API_KEY exists:', !!process.env.JSONBIN_API_KEY);
console.log('JSONBIN_API_KEY value:', process.env.JSONBIN_API_KEY);
console.log('JSONBIN_BIN_ID:', process.env.JSONBIN_BIN_ID);
