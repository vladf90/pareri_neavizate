export function mapFixtureStats({ fixtureId, statistics = [], trends = [], participants = [] }) {
  // Find home and away participant IDs
  const homeParticipant = participants.find(p => p.meta?.location === 'home');
  const awayParticipant = participants.find(p => p.meta?.location === 'away');
  const homeId = homeParticipant?.id;
  const awayId = awayParticipant?.id;

  // If we have trends, extract the latest value for each stat type per team
  // Trends have much more detailed stats than statistics array
  if (trends.length > 0 && homeId && awayId) {
    const latestStats = {};
    
    // Group trends by type and participant, keep only the latest (highest minute)
    for (const trend of trends) {
      const typeName = trend.type?.developer_name;
      if (!typeName) continue;
      
      const key = `${typeName}_${trend.participant_id}`;
      if (!latestStats[key] || (trend.minute ?? 0) > (latestStats[key].minute ?? 0)) {
        latestStats[key] = trend;
      }
    }
    
    // Convert to statistics format (grouped by type with home/away values)
    const statsMap = {};
    for (const trend of Object.values(latestStats)) {
      const typeName = trend.type?.developer_name;
      if (!typeName) continue;
      
      if (!statsMap[typeName]) {
        statsMap[typeName] = { type: typeName, home: null, away: null };
      }
      
      if (trend.participant_id === homeId) {
        statsMap[typeName].home = trend.value ?? trend.data?.value ?? 0;
      } else if (trend.participant_id === awayId) {
        statsMap[typeName].away = trend.value ?? trend.data?.value ?? 0;
      }
    }
    
    // Convert to array and fill missing values with 0
    const processedStats = Object.values(statsMap).map(stat => ({
      type: stat.type,
      home: stat.home ?? 0,
      away: stat.away ?? 0
    }));
    
    return { fixtureId, statistics: processedStats };
  }
  
  // Fallback: use regular statistics if no trends available
  // Process the statistics array into a simpler format
  if (statistics.length > 0) {
    const statsMap = {};
    for (const stat of statistics) {
      const typeName = stat.type?.developer_name;
      if (!typeName) continue;
      
      if (!statsMap[typeName]) {
        statsMap[typeName] = { type: typeName, home: null, away: null };
      }
      
      const value = stat.data?.value ?? 0;
      if (stat.location === 'home') {
        statsMap[typeName].home = value;
      } else if (stat.location === 'away') {
        statsMap[typeName].away = value;
      }
    }
    
    const processedStats = Object.values(statsMap).map(stat => ({
      type: stat.type,
      home: stat.home ?? 0,
      away: stat.away ?? 0
    }));
    
    return { fixtureId, statistics: processedStats };
  }
  
  return { fixtureId, statistics: [] };
}
