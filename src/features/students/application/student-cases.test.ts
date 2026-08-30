import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStudent, updateStudent, deleteStudent } from './student-cases';
import { studentRepository } from '@/features/students/infrastructure/student-repo';
import { db } from '@/lib/db/client';

vi.mock('@/features/students/infrastructure/student-repo', () => ({
  studentRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    remove: vi.fn(),
  }
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    batch: vi.fn(),
    delete: vi.fn(() => ({ where: vi.fn() })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => []) })) })),
  }
}));

vi.mock('@/lib/db/snapshot', () => ({
  captureStudent: vi.fn(),
  restoreStudent: vi.fn(),
}));

vi.mock('@/lib/undo-store', () => ({
  registerUndo: vi.fn(),
}));

vi.mock('@/lib/activity-log', () => ({
  logActivity: vi.fn(),
}));

describe('student-cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createStudent should validate and insert a student', async () => {
    vi.mocked(studentRepository.insert).mockResolvedValueOnce({ id: 's1', name: 'Test Student' } as any);
    const result = await createStudent({ name: 'Test Student', status: 'active', enrolledOn: '2026-01-01' });
    expect(result.id).toBe('s1');
    expect(studentRepository.insert).toHaveBeenCalled();
  });

  it('updateStudent should update and return the student', async () => {
    vi.mocked(studentRepository.update).mockResolvedValueOnce({ id: 's1', name: 'Updated' } as any);
    const result = await updateStudent('s1', { name: 'Updated', status: 'active', enrolledOn: '2026-01-01' });
    expect(result.name).toBe('Updated');
    expect(studentRepository.update).toHaveBeenCalledWith('s1', expect.any(Object));
  });

  it('deleteStudent should call db.batch to delete children', async () => {
    await deleteStudent('s1', { undo: false });
    expect(db.batch).toHaveBeenCalled();
  });
});
