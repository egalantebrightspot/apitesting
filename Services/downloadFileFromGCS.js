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
 
async function downloadFileFromGCS_Service(DID) 
{
    try 
    {
        const storage = await initializeStorageClient();
        const [gcsFiles] = await storage.bucket(bucketName).getFiles({
            prefix: `${DID}`
        });
 
        if (gcsFiles.length > 0) {
            const filteredFiles = gcsFiles.filter(file => (
                file.metadata.metadata.DID === DID
            ));
 
            if (filteredFiles.length > 0) {
                let recentFile = filteredFiles[0];
                for (const file of filteredFiles) {
                    if (file.updated > recentFile.updated) {
                        recentFile = file;
                    }
                }
 
                const [fileContent] = await recentFile.download();
                debug(`Downloaded ${DID} from ${bucketName}`);
                return fileContent;

            } else {
                debug(`File ${DID} with the requested metadata not found`);
                return null;
            }

        } else {
            debug(`No Files matching the name ${DID} was found`);
            return null;
        }

    } catch (error) {
        console.error('Error downloading files:', error);
        throw error;
    }
}
 
module.exports = {
    downloadFileFromGCS_Service
};