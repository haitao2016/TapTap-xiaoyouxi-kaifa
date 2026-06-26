import { projectManager } from './project-manager';
import { buildService } from './build-service';
import { templateService } from './template-service';

export interface CLICommand {
  name: string;
  description: string;
  arguments?: CLIArgument[];
  options?: CLIOption[];
  action: (args: Record<string, any>) => Promise<string>;
}

export interface CLIArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface CLIOption {
  name: string;
  short?: string;
  description: string;
  type?: 'string' | 'boolean' | 'number';
  default?: any;
}

export class CLIService {
  private commands = new Map<string, CLICommand>();

  constructor() {
    this.registerCommands();
  }

  registerCommand(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  async executeCommand(commandName: string, args: Record<string, any>): Promise<string> {
    const command = this.commands.get(commandName);
    if (!command) {
      return `Unknown command: ${commandName}`;
    }

    try {
      return await command.action(args);
    } catch (error) {
      return `Error executing '${commandName}': ${error}`;
    }
  }

  async parseAndExecute(input: string): Promise<string> {
    const parts = input.trim().split(/\s+/);
    if (parts.length === 0) {
      return 'No command provided';
    }

    const commandName = parts[0];
    const args: Record<string, any> = {};
    let currentArg = 0;

    const command = this.commands.get(commandName);
    if (!command) {
      return `Unknown command: ${commandName}`;
    }

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];

      if (part.startsWith('--')) {
        const optionName = part.slice(2);
        const option = command.options?.find(
          o => o.name === optionName || o.short === optionName
        );

        if (option) {
          if (option.type === 'boolean' || option.type === undefined) {
            args[option.name] = true;
          } else {
            i++;
            args[option.name] = parts[i];
          }
        }
      } else if (part.startsWith('-')) {
        const optionShort = part.slice(1);
        const option = command.options?.find(o => o.short === optionShort);

        if (option) {
          if (option.type === 'boolean' || option.type === undefined) {
            args[option.name] = true;
          } else {
            i++;
            args[option.name] = parts[i];
          }
        }
      } else {
        const arg = command.arguments?.[currentArg];
        if (arg) {
          args[arg.name] = part;
          currentArg++;
        }
      }
    }

    return this.executeCommand(commandName, args);
  }

  private registerCommands(): void {
    this.registerCommand({
      name: 'init',
      description: 'Initialize a new TapTap mini-game project',
      arguments: [
        { name: 'name', description: 'Project name', required: true },
      ],
      options: [
        { name: 'template', short: 't', description: 'Template name', type: 'string' },
        { name: 'path', short: 'p', description: 'Project path', type: 'string' },
      ],
      action: async (args) => {
        const name = args.name || 'my-game';
        const template = args.template || 'empty';
        const path = args.path || '.';

        return `Initialized project '${name}' with template '${template}' at ${path}`;
      },
    });

    this.registerCommand({
      name: 'build',
      description: 'Build the project',
      options: [
        { name: 'mode', short: 'm', description: 'Build mode: development/production', type: 'string', default: 'production' },
        { name: 'platform', short: 'p', description: 'Target platform', type: 'string' },
        { name: 'watch', short: 'w', description: 'Watch for changes', type: 'boolean' },
      ],
      action: async (args) => {
        const mode = args.mode || 'production';
        const platform = args.platform || 'web';
        const watch = args.watch || false;

        return `Building project in ${mode} mode for ${platform}...`;
      },
    });

    this.registerCommand({
      name: 'serve',
      description: 'Start development server',
      options: [
        { name: 'port', short: 'p', description: 'Server port', type: 'number', default: 3000 },
        { name: 'host', short: 'h', description: 'Server host', type: 'string', default: 'localhost' },
      ],
      action: async (args) => {
        const port = args.port || 3000;
        const host = args.host || 'localhost';

        return `Server running at http://${host}:${port}`;
      },
    });

    this.registerCommand({
      name: 'deploy',
      description: 'Deploy to TapTap platform',
      options: [
        { name: 'appId', short: 'a', description: 'App ID', type: 'string' },
        { name: 'version', short: 'v', description: 'Version', type: 'string' },
      ],
      action: async (args) => {
        const appId = args.appId;
        const version = args.version;

        if (!appId) {
          return 'Error: --appId is required';
        }

        return `Deploying app ${appId} version ${version || 'latest'}...`;
      },
    });

    this.registerCommand({
      name: 'templates',
      description: 'List available templates',
      action: async () => {
        const result = templateService.getTemplates();
        return result.templates.map(t => `${t.id} - ${t.name}`).join('\n');
      },
    });

    this.registerCommand({
      name: 'help',
      description: 'Show help',
      arguments: [{ name: 'command', description: 'Command name' }],
      action: async (args) => {
        if (args.command) {
          const command = this.commands.get(args.command);
          if (command) {
            let help = `${command.name}: ${command.description}\n`;
            if (command.arguments?.length) {
              help += '\nArguments:\n';
              command.arguments.forEach(arg => {
                help += `  ${arg.name}${arg.required ? ' (required)' : ''}: ${arg.description}\n`;
              });
            }
            if (command.options?.length) {
              help += '\nOptions:\n';
              command.options.forEach(opt => {
                help += `  --${opt.name}${opt.short ? ` (-${opt.short})` : ''}: ${opt.description}\n`;
              });
            }
            return help;
          }
          return `Unknown command: ${args.command}`;
        }

        let help = 'Available commands:\n';
        this.commands.forEach((cmd, name) => {
          help += `  ${name}: ${cmd.description}\n`;
        });
        return help;
      },
    });
  }
}

export const cliService = new CLIService();