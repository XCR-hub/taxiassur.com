interface ProcessDataMessage {
  type: 'process';
  data: any[];
  operation: string;
}

interface CalculateStatsMessage {
  type: 'calculate-stats';
  data: number[];
}

interface GenerateReportMessage {
  type: 'generate-report';
  leads: any[];
}

type WorkerMessage = ProcessDataMessage | CalculateStatsMessage | GenerateReportMessage;

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  try {
    switch (type) {
      case 'process':
        handleProcessData(event.data as ProcessDataMessage);
        break;
      case 'calculate-stats':
        handleCalculateStats(event.data as CalculateStatsMessage);
        break;
      case 'generate-report':
        handleGenerateReport(event.data as GenerateReportMessage);
        break;
      default:
        self.postMessage({ error: 'Unknown operation' });
    }
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
});

function handleProcessData(message: ProcessDataMessage) {
  const { data, operation } = message;
  let result;

  switch (operation) {
    case 'filter':
      result = data.filter(item => item.status === 'active');
      break;
    case 'sort':
      result = [...data].sort((a, b) => a.created_at - b.created_at);
      break;
    case 'group':
      result = data.reduce((acc, item) => {
        const key = item.category;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
      break;
    default:
      result = data;
  }

  self.postMessage({ type: 'process-complete', result });
}

function handleCalculateStats(message: CalculateStatsMessage) {
  const { data } = message;

  if (data.length === 0) {
    self.postMessage({
      type: 'stats-complete',
      result: { count: 0, sum: 0, average: 0, min: 0, max: 0, median: 0 }
    });
    return;
  }

  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((acc, val) => acc + val, 0);
  const count = data.length;
  const average = sum / count;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const variance = data.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  self.postMessage({
    type: 'stats-complete',
    result: { count, sum, average, min, max, median, stdDev, variance }
  });
}

function handleGenerateReport(message: GenerateReportMessage) {
  const { leads } = message;

  const report = {
    total: leads.length,
    byStatus: leads.reduce((acc: Record<string, number>, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {}),
    bySource: leads.reduce((acc: Record<string, number>, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {}),
    conversionRate: (leads.filter(l => l.status === 'converted').length / leads.length * 100).toFixed(2),
    averageValue: (leads.reduce((sum, l) => sum + (l.value || 0), 0) / leads.length).toFixed(2),
    topPerformers: leads
      .sort((a, b) => (b.value || 0) - (a.value || 0))
      .slice(0, 10)
      .map(l => ({ id: l.id, name: l.name, value: l.value })),
    timeline: generateTimeline(leads),
  };

  self.postMessage({ type: 'report-complete', result: report });
}

function generateTimeline(leads: any[]) {
  const timeline: Record<string, number> = {};

  leads.forEach(lead => {
    if (lead.created_at) {
      const date = new Date(lead.created_at).toISOString().split('T')[0];
      timeline[date] = (timeline[date] || 0) + 1;
    }
  });

  return Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export {};
