import {RingBuffer, RingBufferError} from '../src/ring';


test('basic operations', () => {
  const d = new RingBuffer<number>({capacity: 3});
  expect(d.length).toBe(0);
  expect(d.full).toBeFalsy();

  d.enq(1);
  expect(d.length).toBe(1);
  expect(d.full).toBeFalsy();

  d.enq(2);
  expect(d.length).toBe(2);
  expect(d.full).toBeTruthy();

  expect(() => {
    d.enq(3);
  }).toThrowError(RingBufferError);

  expect(d.length).toBe(2);

  expect(d.deq()).toBe(1);
  expect(d.length).toBe(1);
  expect(d.full).toBeFalsy();

  d.enq(10);
  expect(d.length).toBe(2);
  expect(d.full).toBeTruthy();
  expect(() => {
    d.enq(300);
  }).toThrowError(RingBufferError);

  expect(d.deq()).toBe(2);
  expect(d.length).toBe(1);
  expect(d.full).toBeFalsy();

  expect(d.deq()).toBe(10);
  expect(d.length).toBe(0);
  expect(d.full).toBeFalsy();

  expect(d.deq()).toBe(undefined);
  expect(d.length).toBe(0);
  expect(d.full).toBeFalsy();
});
