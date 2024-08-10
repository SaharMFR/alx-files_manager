import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /disconnect', () => {
  it('should log out the user', (done) => {
    chai.request(app)
        .get('/disconnect')
        .set('x-token', 'valid_token_here')
        .end((err, res) => {
          expect(res).to.have.status(204);
          done();
        });
  });

  it('should return 401 if no token is provided', (done) => {
    chai.request(app)
        .get('/disconnect')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('error', 'Unauthorized');
          done();
        });
  });
});
