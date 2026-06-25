function mockData() {
  return {
    depots: [
      { ID: 1, MechanicHours: 60 },
      { ID: 2, MechanicHours: 135 },
      { ID: 3, MechanicHours: 188 },
      { ID: 4, MechanicHours: 97 },
      { ID: 5, MechanicHours: 164 },
    ],
    vehicles: [
      { TaskID: '264e638f-1c7a-4d67-9f9c-53f3d1766d37', Duration: 1, Impact: 5 },
      { TaskID: 'ec40b581-bdfc-43e0-a047-871fdafe8167', Duration: 7, Impact: 3 },
      { TaskID: 'fb1e3165-67c9-4e96-a5c3-2d20085d293b', Duration: 6, Impact: 3 },
      { TaskID: '330065c0-3815-4e10-a18a-b93b117e30a8', Duration: 5, Impact: 1 },
      { TaskID: '72a91abc-4ed7-492c-9e99-348e7437953b', Duration: 5, Impact: 9 },
      { TaskID: '8a7ff5b1-335c-4a2f-96d8-09c4a362e781', Duration: 6, Impact: 10 },
      { TaskID: '1d893de7-fbba-4c77-927b-e3076fe805d5', Duration: 1, Impact: 8 },
      { TaskID: '1743e1b5-9dfd-450b-9905-98c3e054aee1', Duration: 5, Impact: 8 },
      { TaskID: '48851915-eaf5-48ec-a20c-5074d7050c5f', Duration: 8, Impact: 8 },
      { TaskID: '7d81e6ca-8f03-4c4a-9ec0-701f820c5655', Duration: 7, Impact: 8 },
    ],
  };
}

module.exports = { mockData };
