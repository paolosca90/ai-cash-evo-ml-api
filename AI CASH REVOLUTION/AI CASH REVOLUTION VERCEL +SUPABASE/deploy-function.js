/**
 * Manual Deployment Script for Supabase Edge Functions
 * Used when CLI is not available or having issues
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from supabase-functions.env
const SUPABASE_URL = 'https://rvopmdflnecyrwrzhyfy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0Nzg4NCwiZXhwIjoyMDc0MTIzODg0fQ.SopBfRPsnDNEOuje4BUtmplVKu1awpiZes0wlQCKugA';

function deployFunction(functionName) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Deploying function: ${functionName}`);

        const functionPath = path.join(__dirname, 'supabase', 'functions', functionName, 'index.ts');

        if (!fs.existsSync(functionPath)) {
            reject(new Error(`Function file not found: ${functionPath}`));
            return;
        }

        // Read the function code
        const functionCode = fs.readFileSync(functionPath, 'utf8');

        // Step 1: Create function metadata
        const metadataPayload = {
            name: functionName,
            verify_jwt: false
        };

        const metadataData = JSON.stringify(metadataPayload);

        const metadataOptions = {
            hostname: 'rvopmdflnecyrwrzhyfy.supabase.co',
            port: 443,
            path: `/rest/v1/functions?name=eq.${functionName}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(metadataData),
                'Prefer': 'resolution=ignore-duplicates'
            }
        };

        const metadataReq = https.request(metadataOptions, (metadataRes) => {
            let metadataData = '';

            metadataRes.on('data', (chunk) => {
                metadataData += chunk;
            });

            metadataRes.on('end', () => {
                if (metadataRes.statusCode >= 200 && metadataRes.statusCode < 300 || metadataRes.statusCode === 409) {
                    console.log(`✅ Function metadata created/updated for ${functionName}`);

                    // Step 2: Deploy function code
                    const codeOptions = {
                        hostname: 'rvopmdflnecyrwrzhyfy.supabase.co',
                        port: 443,
                        path: `/rest/v1/functions/${functionName}/body`,
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                            'apikey': SUPABASE_SERVICE_ROLE_KEY,
                            'Content-Type': 'text/plain',
                            'Content-Length': Buffer.byteLength(functionCode)
                        }
                    };

                    const codeReq = https.request(codeOptions, (codeRes) => {
                        let codeData = '';

                        codeRes.on('data', (chunk) => {
                            codeData += chunk;
                        });

                        codeRes.on('end', () => {
                            if (codeRes.statusCode >= 200 && codeRes.statusCode < 300) {
                                console.log(`✅ Successfully deployed code for ${functionName}`);
                                resolve({ success: true, functionName });
                            } else {
                                console.error(`❌ Failed to deploy code for ${functionName}:`, codeRes.statusCode, codeData);
                                reject(new Error(`Code deployment failed: ${codeRes.statusCode} - ${codeData}`));
                            }
                        });
                    });

                    codeReq.on('error', (error) => {
                        console.error(`❌ Error deploying code for ${functionName}:`, error.message);
                        reject(error);
                    });

                    codeReq.write(functionCode);
                    codeReq.end();
                } else {
                    console.error(`❌ Failed to create metadata for ${functionName}:`, metadataRes.statusCode, metadataData);
                    reject(new Error(`Metadata creation failed: ${metadataRes.statusCode} - ${metadataData}`));
                }
            });
        });

        metadataReq.on('error', (error) => {
            console.error(`❌ Error creating metadata for ${functionName}:`, error.message);
            reject(error);
        });

        metadataReq.write(metadataData);
        metadataReq.end();
    });
}

async function main() {
    try {
        console.log('🎯 AI CASH REVOLUTION - Manual Function Deployment');
        console.log('===========================================');

        // Deploy the updated function
        await deployFunction('mt5-trade-signals-v2');

        console.log('\n🎉 Deployment completed successfully!');
        console.log('The mt5-trade-signals-v2 function has been deployed with:');
        console.log('- Cleaned TypeScript code');
        console.log('- Proper formatting and indentation');
        console.log('- Support for GET, POST, and PATCH methods');
        console.log('- Enhanced error handling and logging');

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        console.log('\n📝 Alternative deployment options:');
        console.log('1. Use Supabase Dashboard: https://app.supabase.com/project/rvopmdflnecyrwrzhyfy/functions');
        console.log('2. Install CLI manually: https://github.com/supabase/cli');
        console.log('3. Use the cleanup-functions.bat script when CLI is available');

        process.exit(1);
    }
}

main().catch(console.error);

export { deployFunction };