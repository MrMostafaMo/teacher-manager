import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGroup, updateGroup, deleteGroup } from './group-cases';
import { groupRepository } from '@/features/groups/infrastructure/group-repo';
import { db } from '@/lib/db/client';

vi.mock('@/features/groups/infrastructure/group-repo', () => ({
  groupRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    remove: vi.fn(),
  }
}));

vi.mock('@/features/schedule/application/schedule-cases', () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  listSchedule: vi.fn(() => []),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    batch: vi.fn(),
    delete: vi.fn(() => ({ where: vi.fn() })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => []) })) })),
  }
}));

vi.mock('./group-snapshot', () => ({
  captureGroup: vi.fn(),
  restoreGroup: vi.fn(),
}));

vi.mock('@/lib/undo-store', () => ({
  registerUndo: vi.fn(),
}));

vi.mock('@/lib/activity-log', () => ({
  logActivity: vi.fn(),
}));

describe('group-cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createGroup should validate and insert a group', async () => {
    vi.mocked(groupRepository.insert).mockResolvedValueOnce({ id: 'g1', name: 'Test Group' } as any);
    const result = await createGroup({ name: 'Test Group', sessions: [], status: 'active' });
    expect(result.id).toBe('g1');
    expect(groupRepository.insert).toHaveBeenCalled();
  });

  it('updateGroup should update and return the group', async () => {
    vi.mocked(groupRepository.update).mockResolvedValueOnce({ id: 'g1', name: 'Updated' } as any);
    const result = await updateGroup('g1', { name: 'Updated', sessions: [], status: 'active' });
    expect(result.name).toBe('Updated');
    expect(groupRepository.update).toHaveBeenCalledWith('g1', expect.any(Object));
  });

  it('deleteGroup should call db.batch to delete children', async () => {
    await deleteGroup('g1', { undo: false });
    expect(db.batch).toHaveBeenCalled();
  });
});
