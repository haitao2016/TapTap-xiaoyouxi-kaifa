import { projectManager } from '../packages/core/src/project-manager';

describe('ProjectManager', () => {
  beforeEach(() => {
    (projectManager as any).projects.clear();
    (projectManager as any).currentProjectId = null;
  });

  describe('createProject', () => {
    it('should create a new project', () => {
      const project = projectManager.createProject({
        name: 'Test Project',
        path: '/tmp/test-projects/test',
        template: 'default',
      });
      
      expect(project).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeDefined();
    });

    it('should generate unique project IDs', () => {
      const project1 = projectManager.createProject({
        name: 'Project 1',
        path: '/tmp/test-projects/1',
        template: 'default',
      });
      
      const project2 = projectManager.createProject({
        name: 'Project 2',
        path: '/tmp/test-projects/2',
        template: 'default',
      });
      
      expect(project1.id).not.toBe(project2.id);
    });

    it('should set default values for optional fields', () => {
      const project = projectManager.createProject({
        name: 'Minimal Project',
        path: '/tmp/test-projects/project',
        template: 'default',
      });
      
      expect(project.description).toBe('');
      expect(project.version).toBe('0.1.0');
      expect(project.targetPlatform).toContain('webgl');
    });
  });

  describe('getProject', () => {
    it('should return null for non-existent project', () => {
      const project = projectManager.getProject('non-existent-id');
      expect(project).toBeNull();
    });

    it('should return project by ID', () => {
      const created = projectManager.createProject({
        name: 'Get Test',
        path: '/tmp/test-projects/get',
        template: 'default',
      });
      
      const project = projectManager.getProject(created.id);
      expect(project).toBeDefined();
      expect(project?.name).toBe('Get Test');
    });
  });

  describe('getAllProjects', () => {
    it('should return empty array when no projects', () => {
      const projects = projectManager.getAllProjects();
      expect(projects).toHaveLength(0);
    });

    it('should return all projects', () => {
      projectManager.createProject({ name: 'P1', path: '/tmp/test-projects/p1', template: 'default' });
      projectManager.createProject({ name: 'P2', path: '/tmp/test-projects/p2', template: 'default' });
      
      const projects = projectManager.getAllProjects();
      expect(projects).toHaveLength(2);
    });
  });

  describe('updateProject', () => {
    it('should update project properties', () => {
      const project = projectManager.createProject({
        name: 'Original Name',
        path: '/tmp/test-projects/original',
        template: 'default',
      });
      
      const updated = projectManager.updateProject(project.id, {
        name: 'Updated Name',
        description: 'New description',
      });
      
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('New description');
      expect(updated?.path).toBe('/path/original');
    });

    it('should return null for non-existent project', () => {
      const result = projectManager.updateProject('non-existent', { name: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', () => {
      const project = projectManager.createProject({
        name: 'To Delete',
        path: '/tmp/test-projects/delete',
        template: 'default',
      });
      
      const result = projectManager.deleteProject(project.id);
      expect(result).toBe(true);
      
      const deleted = projectManager.getProject(project.id);
      expect(deleted).toBeNull();
    });

    it('should return false for non-existent project', () => {
      const result = projectManager.deleteProject('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('setCurrentProject', () => {
    it('should set current project', () => {
      const project = projectManager.createProject({
        name: 'Current Test',
        path: '/tmp/test-projects/current',
        template: 'default',
      });
      
      projectManager.setCurrentProject(project.id);
      
      expect(projectManager.getCurrentProject()?.id).toBe(project.id);
    });

    it('should clear current project with null', () => {
      const project = projectManager.createProject({
        name: 'Clear Test',
        path: '/tmp/test-projects/clear',
        template: 'default',
      });
      
      projectManager.setCurrentProject(project.id);
      projectManager.setCurrentProject(null);
      
      expect(projectManager.getCurrentProject()).toBeNull();
    });
  });

  describe('getCurrentProject', () => {
    it('should return null when no current project', () => {
      expect(projectManager.getCurrentProject()).toBeNull();
    });
  });

  describe('openProject', () => {
    it('should return null for non-existent path', async () => {
      const project = await projectManager.openProject('/non/existent/path');
      expect(project).toBeNull();
    });
  });

  describe('importProject', () => {
    it('should handle invalid project data', async () => {
      const project = await projectManager.importProject({
        name: '',
        path: '',
      });
      
      expect(project).toBeNull();
    });
  });

  describe('exportProject', () => {
    it('should export project as JSON', () => {
      const project = projectManager.createProject({
        name: 'Export Test',
        path: '/tmp/test-projects/export',
        template: 'default',
        description: 'Test description',
      });
      
      const exported = projectManager.exportProject(project.id);
      
      expect(exported).toBeDefined();
      expect(exported.name).toBe('Export Test');
      expect(exported.description).toBe('Test description');
    });

    it('should return null for non-existent project', () => {
      const exported = projectManager.exportProject('non-existent');
      expect(exported).toBeNull();
    });
  });

  describe('getRecentProjects', () => {
    it('should return empty array when no projects', () => {
      const recent = projectManager.getRecentProjects();
      expect(recent).toHaveLength(0);
    });

    it('should return recent projects sorted by last opened', () => {
      const p1 = projectManager.createProject({ name: 'P1', path: '/tmp/test-projects/p1', template: 'default' });
      const p2 = projectManager.createProject({ name: 'P2', path: '/tmp/test-projects/p2', template: 'default' });
      
      projectManager.openProject(p2.path);
      projectManager.openProject(p1.path);
      
      const recent = projectManager.getRecentProjects();
      expect(recent).toHaveLength(2);
      expect(recent[0].id).toBe(p1.id);
    });
  });

  describe('clearRecentProjects', () => {
    it('should clear recent projects', () => {
      projectManager.createProject({ name: 'R1', path: '/tmp/test-projects/r1', template: 'default' });
      projectManager.createProject({ name: 'R2', path: '/tmp/test-projects/r2', template: 'default' });
      
      projectManager.clearRecentProjects();
      
      const recent = projectManager.getRecentProjects();
      expect(recent).toHaveLength(0);
    });
  });

  describe('getTemplates', () => {
    it('should return available templates', () => {
      const templates = projectManager.getTemplates();
      
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      const defaultTemplate = templates.find(t => t.id === 'default');
      expect(defaultTemplate).toBeDefined();
    });
  });

  describe('searchProjects', () => {
    it('should return empty array for empty query', () => {
      const results = projectManager.searchProjects('');
      expect(results).toHaveLength(0);
    });

    it('should search by project name', () => {
      projectManager.createProject({ name: 'React Game', path: '/tmp/test-projects/r1', template: 'default' });
      projectManager.createProject({ name: 'Unity App', path: '/tmp/test-projects/u1', template: 'default' });
      
      const results = projectManager.searchProjects('React');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('React Game');
    });

    it('should search by description', () => {
      projectManager.createProject({ 
        name: 'Test Game', 
        path: '/tmp/test-projects/t1', 
        template: 'default',
        description: 'A multiplayer online game',
      });
      
      const results = projectManager.searchProjects('multiplayer');
      expect(results).toHaveLength(1);
    });
  });
});
