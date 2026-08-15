// Navigation event predicates: pure DOM-level checks that classify a click on
// an anchor as a plain same-origin navigation. Feature-agnostic by design —
// any feature (transition, reading, community) consumes the same predicate
// instead of reaching into another feature's internals.
// 导航事件谓词：纯 DOM 层判断，将一次锚点点击归类为普通同源导航。
// 设计上与具体 feature 无关 —— 各 feature（transition、reading、community）
// 消费同一谓词，而不是深入其他 feature 的内部实现。

export function isPlainInternalNavigation(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.download ||
    (anchor.target && anchor.target !== '_self')
  ) {
    return false;
  }

  const target = new URL(anchor.href, window.location.href);
  return target.origin === window.location.origin;
}
