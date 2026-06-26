// Collaboration & Cloud Sync types

// CRDT types
export interface CRDTDocument {
  id: string;
  content: string;
  clock: number;
  clientId: string;
  version: number;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  filePath: string;
  line: number;
  column: number;
  selection?: { start: number; end: number };
}

export interface Collaborator {
  userId: string;
  userName: string;
  email?: string;
  avatar?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  online: boolean;
  joinedAt: number;
}

export interface CollabProject {
  projectId: string;
  ownerId: string;
  collaborators: Map<string, Collaborator>;
  documents: Map<string, CRDTDocument>;
  cursors: Map<string, RemoteCursor>;
}

export interface Operation {
  id: string;
  clientId: string;
  userName: string;
  filePath: string;
  type: 'insert' | 'delete' | 'update';
  content?: string;
  position: number;
  length?: number;
  timestamp: number;
}

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  undoStack: Operation[];
  redoStack: Operation[];
}

// Cloud Storage types
export interface CloudFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  isDirectory: boolean;
  parentId?: string;
  etag?: string;
}

export interface CloudSyncStatus {
  synced: boolean;
  pendingChanges: number;
  lastSyncedAt?: number;
  error?: string;
  conflictFiles?: string[];
}

export interface CloudSyncOptions {
  autoSync: boolean;
  syncInterval: number;
  wifiOnly: boolean;
  excludePatterns: string[];
}

// Version Control types
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  timestamp: number;
  parentHashes: string[];
  files: string[];
}

export interface GitBranch {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
  lastCommit?: GitCommit;
}

export interface GitRemote {
  name: string;
  url: string;
  fetchUrl?: string;
  pushUrl?: string;
}

export interface GitStatus {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  conflicts: string[];
  ahead: number;
  behind: number;
}

export interface DesignVersion {
  id: string;
  projectId: string;
  version: string;
  name: string;
  description?: string;
  author: string;
  createdAt: number;
  snapshot: string;
  tags?: string[];
}

// Art Asset Review types
export interface ArtAssetReview {
  id: string;
  assetId: string;
  assetName: string;
  assetType: 'sprite' | 'animation' | 'background' | 'ui' | 'effect' | 'other';
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'revision';
  reviewer?: string;
  comments: ArtAssetComment[];
  createdAt: number;
  updatedAt: number;
}

export interface ArtAssetComment {
  id: string;
  author: string;
  content: string;
  position?: { x: number; y: number; width?: number; height?: number };
  timestamp: number;
  resolved: boolean;
  replies?: ArtAssetComment[];
}

// Team Workspace types
export interface TeamWorkspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  projects: string[];
  settings: WorkspaceSettings;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joinedAt: number;
  lastActiveAt?: number;
}

export interface WorkspaceSettings {
  allowGuestInvite: boolean;
  requireApproval: boolean;
  maxMembers: number;
  storageQuota: number;
  allowedFileTypes: string[];
}

// GDD Collaboration types
export interface GDDCollabSession {
  id: string;
  gddId: string;
  participants: GDDParticipant[];
  currentSection: string;
  cursors: Map<string, GDDCursor>;
  version: number;
  updatedAt: number;
}

export interface GDDParticipant {
  userId: string;
  userName: string;
  color: string;
  isActive: boolean;
  permission: 'view' | 'edit' | 'admin';
}

export interface GDDCursor {
  userId: string;
  position: { section: number; offset: number };
  selection?: { start: number; end: number };
}
