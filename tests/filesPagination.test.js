import chai from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /files', () => {
  let token;

  before(async () => {
    const user = {
      email: 'testpagination@example.com',
      password: 'password123',
    };
    
    await chai.request(app)
      .post('/users')
      .send(user);

    const res = await chai.request(app)
      .get('/connect')
      .set('Authorization', `Basic ${Buffer.from(`${user.email}:${user.password}`).toString('base64')}`);

    token = res.body.token;

    for (let i = 0; i < 15; i++) {
      const file = {
        name: `testfile${i}.png`,
        type: 'image',
        parentId: 0,
        isPublic: true,
        data: Buffer.from('testdata').toString('base64'),
      };

      await chai.request(app)
        .post('/files')
        .set('x-token', token)
        .send(file);
    }
  });

  it('should return paginated files', (done) => {
    chai.request(app)
      .get('/files?page=1&limit=10')
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body.files).to.be.an('array');
        expect(res.body.files.length).to.be.at.most(10);
        done();
      });
  });

  it('should return 400 for invalid pagination parameters', (done) => {
    chai.request(app)
      .get('/files?page=invalid&limit=10')
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body).to.have.property('error', 'Invalid pagination parameters');
        done();
      });
  });
});
