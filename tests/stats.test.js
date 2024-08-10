import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /stats', () => {
  it('should return correct statistics', (done) => {
    chai.request(app)
        .get('/stats')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('users');
          expect(res.body).to.have.property('files');
          done();
        });
  });
});
