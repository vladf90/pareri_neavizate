// DTO pentru standings widget
export class StandingsRowDTO {
  constructor({ teamId, teamName, position, points, movement }) {
    this.teamId = teamId;
    this.teamName = teamName;
    this.position = position;
    this.points = points;
    this.movement = movement;
  }
}
