import { Queue } from 'bull';
import { dbClient } from './utils/db';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import path from 'path';

const fileQueue = new Queue('fileQueue', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
});

const userQueue = new Queue('userQueue', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT }
});

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  try {
    const file = await dbClient.db.collection('files').findOne({
      _id: new ObjectId(fileId),
      userId: new ObjectId(userId),
    });

    if (!file) {
      throw new Error('File not found');
    }

    const filePath = path.join('/tmp/files_manager', file.localPath);

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

userQueue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) {
    return done(new Error('Missing userId'));
  }

  try {
    const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return done(new Error('User not found'));
    }

    console.log(`Welcome ${user.email}!`);

    done();
  } catch (err) {
    done(err);
  }
});

fileQueue.on('error', (error) => {
  console.error('File queue error:', error);
});

userQueue.on('error', (error) => {
  console.error('User queue error:', error);
});
