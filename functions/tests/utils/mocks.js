const WebhookMock = class {
  constructor({ request, response }) {
    this.req = request;
    this.res = response;
    this.req.body.originalDetectIntentRequest = originalDetectIntentRequest
    this.intent = this.req.body.intent;
    this.parameters = this.req.body.payload;
    this.output = [];
  }

  add() {
    this.output.push(...arguments);
  }

  async handleRequest(intentMap) {
    const intentFn = intentMap.get(this.intent);
    await intentFn(this);
    this.res.json(this.output);
  }
}

// WebhookMock.prototype.add = sinon.stub();

const originalDetectIntentRequest = {
  payload: {
    source: 'spark',
    data: {
      created: '2020-02-09T21:44:41.649Z',
      ownedBy: 'creator',
      status: 'active',
      targetUrl: 'https://bots.api.ai/spark/aaaeb48e-79cd-4f47-858a-ae4a49c65c14/webhook',
      resource: 'messages',
      orgId: 'Y',
      name: 'webhhokaaaeb48e',
      event: 'created',
      id: 'Y',
      createdBy: 'Y',
      data: {
        personId: 'Y',
        personEmail: 'victormanuel.puebla.next@bbva.com',
        roomId: 'Y',
        id: 'Y',
        roomType: 'direct',
        created: '2020-02-24T08:03:16.472Z'
      },
      actorId: 'Y',
      appId: 'Y'
    }
  }

};


module.exports = {
  WebhookMock
};