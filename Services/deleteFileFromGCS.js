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

async function deleteFileFromGCS_Service(filename) 
{   
    try {     
        const storage = await initializeStorageClient();
        await storage.bucket(bucketName).file(filename).delete();     
        debug(`File ${filename} deleted from ${bucketName}`);   
    } catch (error) {     
        console.error('Error deleting file:', error);     
        throw error;   
    } 
}

module.exports = {
    deleteFileFromGCS_Service
}