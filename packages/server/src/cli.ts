#!/usr/bin/env node
import { debugServer } from './debug-server.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
TapDev 调试服务器

用法:
  tapdev-server [port]

选项:
  --help, -h    显示帮助信息
  --project-id  设置项目 ID (默认: standalone)

环境变量:
  TAPDEV_DEBUG_PORT  监听端口 (默认: 8081)
  TAPDEV_PROJECT_ID  项目 ID
`);
  process.exit(0);
}

const portIndex = args.findIndex(arg => !arg.startsWith('-'));
const port = Number(args[portIndex] ?? process.env.TAPDEV_DEBUG_PORT ?? 8081);

const projectIdArgIndex = args.indexOf('--project-id');
const projectId = (projectIdArgIndex !== -1 && args[projectIdArgIndex + 1]) 
  || process.env.TAPDEV_PROJECT_ID 
  || 'standalone';

if (isNaN(port) || port < 0 || port > 65535) {
  console.error(`无效的端口号: ${args[portIndex] ?? port}`);
  process.exit(1);
}

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
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      console.log(`[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`);
    },
  });

  const shutdown = async () => {
    console.log('\n[TapDev Server] Shutting down...');
    await debugServer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[TapDev Server] Fatal error:', err);
  process.exit(1);
});
