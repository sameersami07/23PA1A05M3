const { getAccessToken } = require('logging-middleware');

class EvaluationClient {
  constructor(creds) {
    this.creds = creds;
  }

  async getJSON(path) {
    const token = await getAccessToken(this.creds);
    const response = await fetch(`${this.creds.baseURL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`GET ${path} failed (${response.status}): ${body}`);
    }
    return JSON.parse(body);
  }

  async getDepots() {
    const data = await this.getJSON('/depots');
    return data.depots;
  }

  async getVehicles() {
    const data = await this.getJSON('/vehicles');
    return data.vehicles;
  }
}

module.exports = { EvaluationClient };
