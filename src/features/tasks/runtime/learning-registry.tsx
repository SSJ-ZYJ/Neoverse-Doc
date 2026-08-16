/**
 * Page-scoped Learning Registry. Learning primitives register structured
 * descriptors here; consumers never need to infer learning data from DOM
 * order or rendered text.
 *
 * 页面级 Learning Registry。学习原语在此注册结构化 descriptor，消费方不需要
 * 从 DOM 顺序或渲染文本反推学习数据。
 */
'use client';

import { createContext, type ReactNode, useContext, useRef, useSyncExternalStore } from 'react';
import {
  createEmptyLearningRegistry,
  type LearningLabDescriptor,
  type LearningRegistry,
} from './learning-model';

type RegistryListener = () => void;

interface RegisteredTask {
  readonly id: string;
  readonly kind: 'task';
  completed: boolean;
  registrations: number;
}

interface RegisteredLab {
  registrations: number;
  tasks: Map<string, RegisteredTask>;
}

export interface LearningRegistryStore {
  readonly contentId: string;
  readonly getSnapshot: () => LearningRegistry;
  readonly getServerSnapshot: () => LearningRegistry;
  readonly subscribe: (listener: RegistryListener) => () => void;
  readonly registerLab: (labId: string) => () => void;
  readonly registerTask: (labId: string, taskId: string, completed: boolean) => () => void;
  readonly updateTask: (labId: string, taskId: string, completed: boolean) => void;
}

const LearningRegistryContext = createContext<LearningRegistryStore | undefined>(undefined);

export function createLearningRegistryStore(contentId: string): LearningRegistryStore {
  const labs = new Map<string, RegisteredLab>();
  const listeners = new Set<RegistryListener>();
  let snapshot = createEmptyLearningRegistry(contentId);

  function notify() {
    for (const listener of listeners) listener();
  }

  function rebuildSnapshot() {
    const nextLabs: LearningLabDescriptor[] = [];
    for (const [id, lab] of labs) {
      if (lab.registrations === 0 && lab.tasks.size === 0) continue;

      nextLabs.push({
        id,
        tasks: Array.from(lab.tasks.values()).map(
          ({ registrations: _registrations, ...task }) => task,
        ),
      });
    }

    snapshot = { contentId, labs: nextLabs };
    notify();
  }

  function getOrCreateLab(labId: string): RegisteredLab {
    const existing = labs.get(labId);
    if (existing) return existing;

    const lab: RegisteredLab = { registrations: 0, tasks: new Map() };
    labs.set(labId, lab);
    return lab;
  }

  function maybeDeleteLab(labId: string, lab: RegisteredLab) {
    if (lab.registrations === 0 && lab.tasks.size === 0) labs.delete(labId);
  }

  function reportDuplicate(kind: 'Lab' | 'Task', identity: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[LearningRegistry] Duplicate ${kind} id: ${identity}`);
    }
  }

  return {
    contentId,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    registerLab(labId) {
      const lab = getOrCreateLab(labId);
      if (lab.registrations > 0) reportDuplicate('Lab', labId);
      lab.registrations += 1;
      rebuildSnapshot();

      let active = true;
      return () => {
        if (!active) return;
        active = false;
        lab.registrations -= 1;
        maybeDeleteLab(labId, lab);
        rebuildSnapshot();
      };
    },
    registerTask(labId, taskId, completed) {
      const lab = getOrCreateLab(labId);
      const existing = lab.tasks.get(taskId);
      if (existing) {
        reportDuplicate('Task', `${labId}/${taskId}`);
        existing.registrations += 1;
      } else {
        lab.tasks.set(taskId, {
          id: taskId,
          kind: 'task',
          completed,
          registrations: 1,
        });
      }
      rebuildSnapshot();

      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const registeredTask = lab.tasks.get(taskId);
        if (!registeredTask) return;

        registeredTask.registrations -= 1;
        if (registeredTask.registrations === 0) lab.tasks.delete(taskId);
        maybeDeleteLab(labId, lab);
        rebuildSnapshot();
      };
    },
    updateTask(labId, taskId, completed) {
      const lab = labs.get(labId);
      const task = lab?.tasks.get(taskId);
      if (!task || task.completed === completed) return;
      task.completed = completed;
      rebuildSnapshot();
    },
  };
}

const EMPTY_REGISTRY = createEmptyLearningRegistry('');
const EMPTY_STORE: LearningRegistryStore = {
  contentId: '',
  getSnapshot: () => EMPTY_REGISTRY,
  getServerSnapshot: () => EMPTY_REGISTRY,
  subscribe: () => () => {},
  registerLab: () => () => {},
  registerTask: () => () => {},
  updateTask: () => {},
};

export function LearningRegistryProvider({
  children,
  contentId,
}: {
  children: ReactNode;
  contentId: string;
}) {
  const storeRef = useRef<LearningRegistryStore | null>(null);
  if (!storeRef.current || storeRef.current.contentId !== contentId) {
    storeRef.current = createLearningRegistryStore(contentId);
  }

  return (
    <LearningRegistryContext.Provider value={storeRef.current}>
      {children}
    </LearningRegistryContext.Provider>
  );
}

export function useOptionalLearningRegistryStore(): LearningRegistryStore | undefined {
  return useContext(LearningRegistryContext);
}

export function useLearningRegistry(): LearningRegistry {
  const store = useContext(LearningRegistryContext) ?? EMPTY_STORE;
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
