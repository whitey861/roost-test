import { describe, it, expect } from 'vitest';
import { Counter } from '../src/counter';

describe('Counter', () => {
  it('should initialize with value 0', () => {
    const counter = new Counter();
    expect(counter.value()).toBe(0);
  });

  it('should increment value by 1', () => {
    const counter = new Counter();
    counter.increment();
    expect(counter.value()).toBe(1);
  });

  it('should decrement value by 1', () => {
    const counter = new Counter();
    counter.decrement();
    expect(counter.value()).toBe(-1);
  });

  it('should handle multiple increments', () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.increment();
    expect(counter.value()).toBe(3);
  });

  it('should handle multiple decrements', () => {
    const counter = new Counter();
    counter.decrement();
    counter.decrement();
    counter.decrement();
    expect(counter.value()).toBe(-3);
  });

  it('should handle chaining increments and decrements', () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.decrement();
    counter.increment();
    counter.decrement();
    counter.decrement();
    expect(counter.value()).toBe(0);
  });

  it('should allow value to go negative', () => {
    const counter = new Counter();
    counter.decrement();
    counter.decrement();
    counter.decrement();
    counter.decrement();
    counter.decrement();
    expect(counter.value()).toBe(-5);
  });

  it('should handle complex sequence of operations', () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.increment();
    counter.increment();
    counter.increment();
    counter.decrement();
    counter.decrement();
    expect(counter.value()).toBe(3);
  });
});
