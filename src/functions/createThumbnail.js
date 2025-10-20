const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const Jimp = require('jimp');

app.eventGridEvent('createThumbnail', {
    handler: async (event, context) => {
        context.log('Event received:', event);
        
        const blobUrl = event.data.url;
        const urlParts = blobUrl.split('/');
        const blobName = urlParts[urlParts.length - 1];
        
        context.log('Processing blob:', blobName);

        try {
            const blobServiceClient = BlobServiceClient.fromConnectionString(
                process.env.AzureWebJobsStorage
            );
            
            const sourceContainer = blobServiceClient.getContainerClient('myblob');
            const sourceBlobClient = sourceContainer.getBlobClient(blobName);
            
            const downloadResponse = await sourceBlobClient.download(0);
            const chunks = [];
            for await (const chunk of downloadResponse.readableStreamBody) {
                chunks.push(chunk);
            }
            const blobBuffer = Buffer.concat(chunks);
            
            const image = await Jimp.read(blobBuffer);
            const thumbnail = await image.cover(200, 200).quality(80).getBufferAsync(Jimp.MIME_JPEG);

            const targetContainer = blobServiceClient.getContainerClient('thumbnailblob');
            await targetContainer.createIfNotExists();

            const thumbnailName = 'thumb_' + blobName;
            const blockBlobClient = targetContainer.getBlockBlobClient(thumbnailName);
            await blockBlobClient.upload(thumbnail, thumbnail.length, {
                blobHTTPHeaders: { blobContentType: 'image/jpeg' }
            });

            context.log('Success! Created:', thumbnailName);
        } catch (error) {
            context.log.error('Error:', error);
            throw error;
        }
    }
});
