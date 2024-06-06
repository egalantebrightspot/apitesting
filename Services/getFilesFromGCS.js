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

async function getFilesFromGCS_Service() 
{
    try 
    {
        const storage = await initializeStorageClient();
        const [gcsFiles] = await storage.bucket(bucketName).getFiles();
        return gcsFiles.map(file => file.name);

    } catch (error) {
        console.error('Error retrieving files:', error);
        throw error;
    }
}

module.exports = {
    getFilesFromGCS_Service
};