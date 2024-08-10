import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { Queue } from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const fileQueue = new Queue('fileQueue', {
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
});

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const { headers, body } = req;
    const token = headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      const { type: parentType } = parentFile;
      if (parentType !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileId = uuidv4();
    const filePath = path.join(FOLDER_PATH, fileId);

    if (type !== 'folder') {
      try {
        fs.mkdirSync(FOLDER_PATH, { recursive: true });
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath: type !== 'folder' ? filePath : null,
    };

    const result = await dbClient.db.collection('files').insertOne(newFile);

    if (type === 'image') {
      await fileQueue.add({ userId, fileId: result.insertedId });
    }

    return res.status(201).json({ id: result.insertedId, ...newFile });
  }

  static async getShow(req, res) {
    const { headers, params } = req;
    const token = headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: fileId } = params;
    const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const { headers, query } = req;
    const token = headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = 0, page = 0 } = query;
    const pageSize = 20;
    const skip = page * pageSize;

    const files = await dbClient.db.collection('files')
      .aggregate([
        { $match: { userId, parentId } },
        { $skip: skip },
        { $limit: pageSize },
      ]).toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const { headers, params } = req;
    const token = headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: fileId } = params;
    const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne(
      { _id: new ObjectId(fileId), userId },
      { $set: { isPublic: true } },
    );

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

    return res.status(200).json(updatedFile);
  }

  static async putUnpublish(req, res) {
    const { headers, params } = req;
    const token = headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: fileId } = params;
    const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne(
      { _id: new ObjectId(fileId), userId },
      { $set: { isPublic: false } },
    );

    const updatedFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId });

    return res.status(200).json(updatedFile);
  }

  static async getFile(req, res) {
    const { params, query, headers } = req;
    const { id: fileId } = params;
    const { size } = query;

    const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.isPublic === false) {
      const token = headers['x-token'];
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }

      const tokenKey = `auth_${token}`;
      const userId = await redisClient.get(tokenKey);
      if (!userId || userId !== file.userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let filePath = path.join(FOLDER_PATH, `${file._id}`);

    if (file.type === 'image' && size) {
      if (['100', '250', '500'].includes(size)) {
        filePath = path.join(FOLDER_PATH, `${file._id}_${size}`);
      } else {
        return res.status(400).json({ error: 'Invalid size parameter' });
      }
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name);
    if (!mimeType) {
      return res.status(500).json({ error: 'Cannot determine MIME type' });
    }

    return fs.readFile(filePath, (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Cannot read file' });
      }

      res.setHeader('Content-Type', mimeType);
      return res.send(data);
    });
  }
}

export default FilesController;
