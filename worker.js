import { Queue } from 'bull';
import { dbClient } from './utils/db';
import { ObjectID } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import path from 'path';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: new ObjectID(fileId),
    userId: new ObjectID(userId),
  });

  if (!file) {
    throw new Error('File not found');
  }

  const filePath = path.join('/tmp/files_manager', file.localPath);

  try {
    const options = { responseType: 'base64' };

    const thumbnail500 = await imageThumbnail(filePath, { width: 500, ...options });
    const thumbnail250 = await imageThumbnail(filePath, { width: 250, ...options });
    const thumbnail100 = await imageThumbnail(filePath, { width: 100, ...options });

    fs.writeFileSync(`${filePath}_500`, Buffer.from(thumbnail500, 'base64'));
    fs.writeFileSync(`${filePath}_250`, Buffer.from(thumbnail250, 'base64'));
    fs.writeFileSync(`${filePath}_100`, Buffer.from(thumbnail100, 'base64'));

    done();
  } catch (err) {
    done(err);
  }
});
