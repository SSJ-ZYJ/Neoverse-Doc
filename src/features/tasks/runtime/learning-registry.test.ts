import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLearningRegistryStore } from './learning-registry';

describe('learning registry', () => {
  it('publishes structured Labs and Tasks without DOM input', () => {
    const store = createLearningRegistryStore('docs:git-basics');
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });
    const releaseLab = store.registerLab('git-basics');
    const releaseTask = store.registerTask('git-basics', 'install-git', false);

    assert.deepEqual(store.getSnapshot(), {
      contentId: 'docs:git-basics',
      labs: [
        {
          id: 'git-basics',
          tasks: [{ id: 'install-git', kind: 'task', completed: false }],
        },
      ],
    });

    store.updateTask('git-basics', 'install-git', true);
    assert.equal(store.getSnapshot().labs[0]?.tasks[0]?.completed, true);
    assert.ok(notifications > 0);

    releaseTask();
    releaseLab();
    assert.deepEqual(store.getSnapshot().labs, []);
    unsubscribe();
  });
});
