import { NextResponse } from 'next/server';

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 300));

  const summaryData = {
    attackSurface: {
        ipaddresses: '5',
        hostnames: '8',
        openports: '24',
        protocols: '3',
        services: '12',
        technologies: '18',
        exposedassets: '2',
        newthisweek: '4',
    },
    vulnerabilitySummary: {
      critical: 2,
      high: 5,
      medium: 12,
      low: 18,
    },
  };

  return NextResponse.json(summaryData);
}

    