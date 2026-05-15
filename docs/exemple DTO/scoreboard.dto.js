// DTO pentru scoreboard widget
export class ScoreboardDTO {
  constructor({ fixtureId, homeTeam, awayTeam, score, minute, state }) {
    this.fixtureId = fixtureId;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.score = score;
    this.minute = minute;
    this.state = state;
  }
}
