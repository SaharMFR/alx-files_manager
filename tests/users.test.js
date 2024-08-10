import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('POST /users', () => {
  it('should create a new user', (done) => {
    chai.request(app)
        .post('/users')
        .send({ email: 'test@example.com', password: 'password123' })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('email', 'test@example.com');
          done();
        });
  });

  it('should return 400 if email or password is missing', (done) => {
    chai.request(app)
        .post('/users')
        .send({ email: 'test@example.com' })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('error');
          done();
        });
  });
});
