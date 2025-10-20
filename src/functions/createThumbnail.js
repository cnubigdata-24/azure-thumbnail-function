const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const Jimp = require('jimp');

app.storageBlob('createThumbnail', {
  path: 'myblob/{name}',
  connection: 'AzureWebJobsStorage',
  handler: async (blob, context) => {
    const blobName = context.triggerMetadata.name;
    context.log('Processing:', blobName);

    try {
      const image = await Jimp.read(blob);
      const thumbnail = await image.cover(200, 200).quality(80).getBufferAsync(Jimp.MIME_JPEG);

      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AzureWebJobsStorage
      );
      const containerClient = blobServiceClient.getContainerClient('thumbnailblob');
      await containerClient.createIfNotExists();

      const thumbnailName = 'thumb_' + blobName;
      const blockBlobClient = containerClient.getBlockBlobClient(thumbnailName);
      await blockBlobClient.upload(thumbnail, thumbnail.length, {
        blobHTTPHeaders: { blobContentType: 'image/jpeg' },
      });

      context.log('Success!', thumbnailName);
    } catch (error) {
      context.log.error('Error:', error);
      throw error;
    }
  },
});
