#!/usr/bin/env node
import { debugServer } from './debug-server';

const port = Number(process.env.TAPDEV_DEBUG_PORT ?? process.argv[2] ?? 8081);
const projectId = process.env.TAPDEV_PROJECT_ID ?? 'standalone';

async function main(): Promise<void> {
  const status = await debugServer.start({
    port,
    projectId,
    host: '0.0.0.0',
  });

  console.log(`[TapDev Server] Debug server running at ${status.url}`);
  console.log(`[TapDev Server] WebSocket: ${status.wsUrl}`);

  debugServer.setEvents({
    onLog: (entry) => {
      console.log(`[${entry.level}] ${entry.message}`);
    },
  });

  const shutdown = async () => {
    await debugServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
