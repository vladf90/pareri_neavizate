export function makeEnvelope({ op, channel, key, version, data }) {
  return { op, channel, key, version, ts: Date.now(), data };
}
