import chai from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('PUT /files/:id/unpublish', () => {
  let token;
  let fileId;

  before(async () => {
    const user = {
      email: 'testunpublish@example.com',
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
      name: 'testunpublish.png',
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

  it('should unpublish a file', (done) => {
    chai.request(app)
      .put(`/files/${fileId}/unpublish`)
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('isPublic', false);
        done();
      });
  });

  it('should return 404 if file does not exist', (done) => {
    chai.request(app)
      .put('/files/invalidfileid/unpublish')
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(404);
        expect(res.body).to.have.property('error', 'Not found');
        done();
      });
  });
});
