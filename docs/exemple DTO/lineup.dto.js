// DTO pentru tactical lineups widget
export class LineupDTO {
  constructor({ fixtureId, formation, players, coach }) {
    this.fixtureId = fixtureId;
    this.formation = formation;
    this.players = players; // array de jucători
    this.coach = coach;
  }
}
