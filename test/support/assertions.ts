/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export function expectErrorShape(body: unknown) {
  expect(body).toMatchObject({
    statusCode: expect.any(Number),
    message: expect.any(String),
    errors: expect.any(Array),
    timestamp: expect.any(String),
    path: expect.any(String),
  });
}
