import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExam, updateExam, deleteExam } from './exam-cases';
import { examRepository } from '@/features/exams/infrastructure/exam-repo';

vi.mock('@/features/exams/infrastructure/exam-repo', () => ({
  examRepository: {
    insert: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    remove: vi.fn(),
    clearForExam: vi.fn(),
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
  captureRows: vi.fn(() => []),
  restoreRows: vi.fn(),
  captureBy: vi.fn(() => []),
}));

vi.mock('@/lib/undo-store', () => ({
  registerUndo: vi.fn(),
}));

vi.mock('./exam-logs', () => ({
  logExamCreate: vi.fn(),
  logExamUpdate: vi.fn(),
  logExamDelete: vi.fn(),
}));

describe('exam-cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createExam should validate and insert an exam', async () => {
    vi.mocked(examRepository.insert).mockResolvedValueOnce({ id: 'e1', title: 'Test Exam' } as any);
    const result = await createExam({ title: 'Test Exam', groupId: 'g1', date: '2026-01-01', maxScore: 100 });
    expect(result.id).toBe('e1');
    expect(examRepository.insert).toHaveBeenCalled();
  });

  it('updateExam should update and return the exam', async () => {
    vi.mocked(examRepository.update).mockResolvedValueOnce({ id: 'e1', title: 'Updated' } as any);
    const result = await updateExam('e1', { title: 'Updated', groupId: 'g1', date: '2026-01-01', maxScore: 100 });
    expect(result!.title).toBe('Updated');
    expect(examRepository.update).toHaveBeenCalledWith('e1', expect.any(Object));
  });

  it('deleteExam should delete the exam', async () => {
    vi.mocked(examRepository.remove).mockResolvedValueOnce(true as any);
    await deleteExam('e1', { undo: false });
    expect(examRepository.remove).toHaveBeenCalledWith('e1');
  });
});
