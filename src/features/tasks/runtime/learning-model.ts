/**
 * Stable learning-domain contracts shared by the registry and its consumers.
 * The model intentionally names future primitive kinds without implementing
 * their rendering or completion semantics in this iteration.
 *
 * 学习域的稳定契约由 Registry 与消费方共享。本轮只实现 task，先为未来的
 * checkpoint / practice 保留明确的原语类型，不提前创建复杂课程系统。
 */

export type LearningPrimitiveKind = 'task' | 'checkpoint' | 'practice';

export interface LearningTaskIdentity {
  readonly contentId: string;
  readonly labId: string;
  readonly taskId: string;
}

export interface LearningTaskDescriptor {
  readonly id: string;
  readonly kind: 'task';
  readonly completed: boolean;
}

export interface LearningLabDescriptor {
  readonly id: string;
  readonly tasks: readonly LearningTaskDescriptor[];
}

export interface LearningRegistry {
  readonly contentId: string;
  readonly labs: readonly LearningLabDescriptor[];
}

// Lab and Task ids are author-owned identifiers, not URLs. Keeping them to one
// delimiter-free segment makes the persisted identity unambiguous while still
// allowing the same task id in different Labs.
// Lab 与 Task id 是作者维护的标识符，不是 URL。限制为不含分隔符的单段值，
// 让持久化身份保持无歧义，同时允许不同 Lab 使用相同的 task id。
export const LEARNING_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isLearningId(value: string): boolean {
  return LEARNING_ID_PATTERN.test(value);
}

export function reportInvalidLearningId(kind: 'Lab' | 'Task', value: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Learning] ${kind} id must be a stable ASCII segment: ${value}`);
  }
}

export function createLearningTaskIdentity(
  contentId: string,
  labId: string,
  taskId: string,
): LearningTaskIdentity {
  return { contentId, labId, taskId };
}

export function createEmptyLearningRegistry(contentId: string): LearningRegistry {
  return { contentId, labs: [] };
}
