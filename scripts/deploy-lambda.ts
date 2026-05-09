import { deployFunction, deploySite, getOrCreateBucket } from '@remotion/lambda';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const execute = async () => {
  // Ensure AWS credentials exist
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error("❌ Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in .env");
    process.exit(1);
  }

  const region = 'us-east-1'; // Standard AWS region
  console.log(`☁️ Getting or creating Remotion S3 bucket in ${region}...`);
  const { bucketName } = await getOrCreateBucket({ region });

  console.log(`📦 Deploying Remotion site to S3 (${bucketName})...`);
  const { serveUrl } = await deploySite({
    entryPoint: path.resolve('./src/remotion/index.ts'),
    bucketName,
    region,
  });
  console.log(`✅ Site deployed to: ${serveUrl}`);

  console.log(`🚀 Deploying Remotion Lambda function...`);
  const { functionName } = await deployFunction({
    createCloudWatchLogGroup: true,
    memorySizeInMb: 3008, // Increased for more CPU power (exactly 2 vCPUs)
    region,
    timeoutInSeconds: 900, // Increased to maximum 15 minutes!
  });
  console.log(`✅ Lambda function deployed: ${functionName}`);

  // Save outputs to .env
  const envPath = path.resolve('./.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const updateEnv = (key: string, value: string) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  };

  updateEnv('REMOTION_AWS_REGION', region);
  updateEnv('REMOTION_BUCKET_NAME', bucketName);
  updateEnv('REMOTION_SERVE_URL', serveUrl);
  updateEnv('REMOTION_FUNCTION_NAME', functionName);

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`\n🎉 Successfully saved Remotion Lambda configuration to .env file!`);
};

execute().catch(console.error);