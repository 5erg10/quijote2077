const request = require('supertest');
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const {admin} = require('../../firebase.initializers');
const countIntents = require('../../utils/countIntents');


const myFirebaseFunctions = require('../../index.js');

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(myFirebaseFunctions.dialogflowFirebaseFulfillment);

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(admin.database(), 'ref').mockImplementation(() => ({
      set: jest.fn().mockImplementation(() => Promise.resolve()),
      once: jest.fn()
  }));
  jest.spyOn(countIntents, 'count').mockImplementation(() => {});
  jest.spyOn(countIntents, 'checkIfNeedHelp').mockImplementation(() => {});
});

module.exports = payload => request(app)
  .post('/')
  .send(payload)
  .accept('json');
