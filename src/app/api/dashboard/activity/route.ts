import { NextResponse } from 'next/server';

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const activityData = {
    scanActivity: {
        scannedAssets: 45, 
        runningScans: 3, 
        waitingScans: 7, 
        totalAssets: 100
    },
  };

  return NextResponse.json(activityData);
}

    