export class Counter {
  private _value: number = 0;

  increment(): void {
    this._value++;
  }

  decrement(): void {
    this._value--;
  }

  value(): number {
    return this._value;
  }
}
