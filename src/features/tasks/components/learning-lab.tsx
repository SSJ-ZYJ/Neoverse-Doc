/**
 * Explicit MDX boundary for a group of persisted Learning Tasks. The wrapper
 * provides list semantics and context without adding a second visual system.
 *
 * 显式 MDX 学习任务组边界。外层提供列表语义与上下文，不新增第二套视觉体系。
 */
'use client';

import { createContext, type ReactNode, useContext, useLayoutEffect } from 'react';
import { isLearningId, reportInvalidLearningId } from '../runtime/learning-model';
import { useOptionalLearningRegistryStore } from '../runtime/learning-registry';

const LearningLabIdContext = createContext<string | undefined>(undefined);

export function useLearningLabId(): string | undefined {
  return useContext(LearningLabIdContext);
}

export function Lab({ children, id }: { children: ReactNode; id: string }) {
  const store = useOptionalLearningRegistryStore();
  const valid = isLearningId(id);

  useLayoutEffect(() => {
    if (!valid) {
      reportInvalidLearningId('Lab', id);
      return;
    }
    return store?.registerLab(id);
  }, [id, store, valid]);

  return (
    <LearningLabIdContext.Provider value={valid ? id : undefined}>
      <ul className="mdx-learning-lab" data-learning-lab-id={valid ? id : undefined}>
        {children}
      </ul>
    </LearningLabIdContext.Provider>
  );
}
