import chai from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('POST /files', () => {
  let token;

  before(async () => {
    const user = {
      email: 'testfileuser@example.com',
      password: 'password123',
    };
    
    await chai.request(app)
      .post('/users')
      .send(user);

    const res = await chai.request(app)
      .get('/connect')
      .set('Authorization', `Basic ${Buffer.from(`${user.email}:${user.password}`).toString('base64')}`);

    token = res.body.token;
  });

  it('should upload a file', (done) => {
    const file = {
      name: 'testfile.png',
      type: 'image',
      parentId: 0,
      isPublic: true,
      data: Buffer.from('testdata').toString('base64'),
    };

    chai.request(app)
      .post('/files')
      .set('x-token', token)
      .send(file)
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('name', 'testfile.png');
        done();
      });
  });

  it('should return 400 if file name is missing', (done) => {
    const file = {
      type: 'image',
      parentId: 0,
      isPublic: true,
      data: Buffer.from('testdata').toString('base64'),
    };

    chai.request(app)
      .post('/files')
      .set('x-token', token)
      .send(file)
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error', 'Missing name');
        done();
      });
  });

  it('should return 400 if type is invalid', (done) => {
    const file = {
      name: 'testfile.png',
      type: 'invalidtype',
      parentId: 0,
      isPublic: true,
      data: Buffer.from('testdata').toString('base64'),
    };

    chai.request(app)
      .post('/files')
      .set('x-token', token)
      .send(file)
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error', 'Missing or invalid type');
        done();
      });
  });
});
