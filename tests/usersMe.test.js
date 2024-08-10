import chai from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /users/me', () => {
  let token;

  before(async () => {
    const user = {
      email: 'testuser@example.com',
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

  it('should return the current user\'s information', (done) => {
    chai.request(app)
      .get('/users/me')
      .set('x-token', token)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('email', 'testuser@example.com');
        done();
      });
  });

  it('should return 401 if no token is provided', (done) => {
    chai.request(app)
      .get('/users/me')
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.body).to.have.property('error', 'Unauthorized');
        done();
      });
  });

  it('should return 401 if the token is invalid', (done) => {
    chai.request(app)
      .get('/users/me')
      .set('x-token', 'invalid-token')
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.body).to.have.property('error', 'Unauthorized');
        done();
      });
  });
});
