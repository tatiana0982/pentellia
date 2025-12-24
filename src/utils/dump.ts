/**
 * Pretty print any data to the console for debugging (TypeScript version).
 * @param  {...unknown} args - Values to dump
 */
export function dump(...args: unknown[]): void {
  const timestamp = new Date().toISOString();

  console.log("══════════ DUMP START ══════════");
  console.log(`Timestamp: ${timestamp}`);
  
  args.forEach((arg, index) => {
    const type = Array.isArray(arg) ? "array" : typeof arg;
    console.log(`\n[${index + 1}] Type: ${type}`);
    try {
      console.log(JSON.stringify(arg, null, 2));
    } catch {
      console.log(arg); // Fallback for circular structures
    }
  });

  console.log("══════════ DUMP END ════════════");
}


