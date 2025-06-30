// Basic test to ensure Jest is working
describe('Basic Tests', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle strings', () => {
    expect('hello').toBe('hello');
  });

  test('should handle arrays', () => {
    expect([1, 2, 3]).toEqual([1, 2, 3]);
  });

  test('should handle objects', () => {
    expect({ name: 'test' }).toEqual({ name: 'test' });
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});
