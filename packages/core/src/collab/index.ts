export { collabService, CollabService } from './collab-service';
export type {
  CRDTDocument,
  RemoteCursor,
  Collaborator,
  CollabProject,
  Operation,
  HistoryEntry,
  ConflictInfo,
} from './collab-service';

export { cloudStorageService, CloudStorageService } from './cloud-storage-service';
export type { CloudProject, ShareLink } from './cloud-storage-service';

export { gitService, GitService } from './git-service';
export type {
  GitStatus,
  GitFileChange,
  GitCommit,
  GitDiffHunk,
  GitDiff,
  GitBranch,
  GitRemote,
  GitStashEntry,
  MergeConflictRegion,
  GitTag,
} from './git-service';

export { teamService, TeamService } from './team-workspace-service';
export type {
  TeamRole,
  Permission,
  TeamMember,
  TeamProject,
  WorkspaceSettings,
  Invitation,
  Team,
} from './team-workspace-service';
