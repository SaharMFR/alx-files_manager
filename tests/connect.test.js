import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('GET /connect', () => {
  it('should authenticate user with valid credentials', (done) => {
    const credentials = Buffer.from('test@example.com:password123').toString('base64');
    chai.request(app)
        .get('/connect')
        .set('Authorization', `Basic ${credentials}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('token');
          done();
        });
  });

  it('should return 401 for invalid credentials', (done) => {
    const credentials = Buffer.from('invalid:credentials').toString('base64');
    chai.request(app)
        .get('/connect')
        .set('Authorization', `Basic ${credentials}`)
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('error', 'Unauthorized');
          done();
        });
  });
});
