import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple component for testing
const TestComponent: React.FC = () => {
  return <div data-testid='test-component'>Hello World</div>;
};

describe('Basic Tests', () => {
  test('renders test component', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('test-component');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
  });

  test('basic math operations', () => {
    expect(1 + 1).toBe(2);
    expect(2 * 3).toBe(6);
  });

  test('string operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
    expect('world'.length).toBe(5);
  });

  test('array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });

  test('async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});
