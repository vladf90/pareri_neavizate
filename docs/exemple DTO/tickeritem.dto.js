// DTO pentru ticker widget
export class TickerItemDTO {
  constructor({ fixtureId, state, minute, score }) {
    this.fixtureId = fixtureId;
    this.state = state;
    this.minute = minute;
    this.score = score;
  }
}
