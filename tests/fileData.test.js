import chai from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../server';
import fs from 'fs';
import path from 'path';

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /files/:id/data', () => {
  let token;
  let fileId;

  before(async () => {
    const user = {
      email: 'testfiledata@example.com',
      password: 'password123',
    };
    
    await chai.request(app)
      .post('/users')
      .send(user);

    const res = await chai.request(app)
      .get('/connect')
      .set('Authorization', `Basic ${Buffer.from(`${user.email}:${user.password}`).toString('base64')}`);

    token = res.body.token;

    const file = {
      name: 'testfiledata.png',
      type: 'image',
      parentId: 0,
      isPublic: true,
      data: Buffer.from('testdata').toString('base64'),
    };

    const fileRes = await chai.request(app)
      .post('/files')
      .set('x-token', token)
      .send(file);

    fileId = fileRes.body.id;
  });

  it('should return the file data', (done) => {
    chai.request(app)
      .get(`/files/${fileId}/data`)
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res).to.be.a('buffer');
        done();
      });
  });

  it('should return 404 if file does not exist', (done) => {
    chai.request(app)
      .get('/files/invalidfileid/data')
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(404);
        expect(res.body).to.have.property('error', 'Not found');
        done();
      });
  });

  it('should return 404 if size is invalid', (done) => {
    chai.request(app)
      .get(`/files/${fileId}/data?size=invalidsize`)
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(404);
        expect(res.body).to.have.property('error', 'Not found');
        done();
      });
  });
});
