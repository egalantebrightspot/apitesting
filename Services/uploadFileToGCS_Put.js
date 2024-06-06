const debug = require('debug')('app:startup');
const { Storage } = require('@google-cloud/storage');
const config = require('config');

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function getServiceAccountKey() {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: config.get('secretResourceNameForServiceAccountKeyContentsForAccessingGcpBucket')
    });
   
    const keyFile = JSON.parse(version.payload.data.toString('utf8'));
    return keyFile;
  }
   
  async function initializeStorageClient() {
    const keyFile = await getServiceAccountKey();
    const storage = new Storage({ credentials: keyFile });
    return storage;
  }

const bucketName = config.get('bucketName');

async function uploadFileToGCS_Put_Service(fileStreamFromUser, metadataFromUser)
{
  try 
  {
      const storage = await initializeStorageClient();
      const fileName = metadataFromUser.DID;
      const fileStream = fileStreamFromUser.buffer;
      const fileBuffer = Buffer.from(fileStream, 'binary');
      const bucket = storage.bucket(bucketName);
      const theFile = bucket.file(metadataFromUser.DID);
      const metadata = {
        metadata: {
          ...metadataFromUser,
          SomeConstantValue1: 'WhateverConstantValueIsRequired1', // To remove eventually
          SomeConstantValue2: 'WhateverConstantValueIsRequired2', // To remove eventually
          FileSize: `${fileBuffer.length} bytes`
        }
      };
      
      const writeStream = theFile.createWriteStream({
        metadata: metadata,
        resumable: false
      });

      writeStream.end(fileStream);
      
      // Wait for the upload to finish
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      debug(`${fileName} uploaded to ${bucketName} with its associated metadata`);
  } 
  catch (err) 
  {
    console.error('Error uploading files:', err);
  }
}

module.exports = {
  uploadFileToGCS_Put_Service
}