import chai from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('PUT /files/:id/publish', () => {
  let token;
  let fileId;

  before(async () => {
    const user = {
      email: 'testpublish@example.com',
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
      name: 'testpublish.png',
      type: 'image',
      parentId: 0,
      isPublic: false,
      data: Buffer.from('testdata').toString('base64'),
    };

    const fileRes = await chai.request(app)
      .post('/files')
      .set('x-token', token)
      .send(file);

    fileId = fileRes.body.id;
  });

  it('should publish a file', (done) => {
    chai.request(app)
      .put(`/files/${fileId}/publish`)
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('isPublic', true);
        done();
      });
  });

  it('should return 404 if file does not exist', (done) => {
    chai.request(app)
      .put('/files/invalidfileid/publish')
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(404);
        expect(res.body).to.have.property('error', 'Not found');
        done();
      });
  });
});
