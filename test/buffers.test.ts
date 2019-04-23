import {BufferError, WriteBuffer} from '../src/buffer';
import * as chars from '../src/chars';


test('matches edgedb-python packing', () => {
  const w: WriteBuffer = new WriteBuffer();

  w.beginMessage(chars.$E)
   .writeUInt16(10)
   .writeString('aaaaaa')
   .endMessage()
   .beginMessage(chars.$P)
   .writeUInt32(1000001)
   .writeString('bbbbbbbbb')
   .endMessage();

  const buf: Buffer = w.unwrap();
  expect(buf.toString('base64')).toBe(
    'RQAAABAACgAAAAZhYWFhYWFQAAAAFQAPQkEAAAAJYmJiYmJiYmJi');
});


test('maintains internal messages integrity', () => {
  const w: WriteBuffer = new WriteBuffer();

  expect(() => {
    w.writeInt16(10);
  }).toThrowError(BufferError);

  expect(() => {
    w.writeString('SELECT ...');
  }).toThrowError(BufferError);

  expect(() => {
    w.endMessage();
  }).toThrowError(BufferError);

  w.beginMessage(chars.$E);

  expect(() => {
    w.beginMessage(chars.$P);
  }).toThrowError(BufferError);

  expect(() => {
    w.unwrap();
  }).toThrowError(BufferError);
});
