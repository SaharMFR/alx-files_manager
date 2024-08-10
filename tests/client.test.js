import { expect } from 'chai';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

describe('clients Tests', () => {
  describe('redis Client', () => {
    it('should connect to Redis', (done) => {
      redisClient.get('test', (err, reply) => {
        expect(err).to.be.null;
        done();
      });
    });
  });

  describe('DB Client', () => {
    it('should connect to MongoDB', async () => {
      const isConnected = await dbClient.isAlive();
      expect(isConnected).to.be.true;
    });

    it('should count documents in a collection', async () => {
      const usersCount = await dbClient.nbUsers();
      expect(usersCount).to.be.a('number');
    });
  });
});
