// DTO pentru live stats widget
export class LiveStatsDTO {
  constructor({ fixtureId, shots, shotsOnTarget, corners, fouls, possession }) {
    this.fixtureId = fixtureId;
    this.shots = shots;
    this.shotsOnTarget = shotsOnTarget;
    this.corners = corners;
    this.fouls = fouls;
    this.possession = possession;
  }
}
