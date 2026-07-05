// Navbar brand title rendered by fumadocs BaseLayout.
// Previously captured a transition snapshot when leaving docs for the
// homepage; that direction now uses page-enter (blur) via the asymmetric
// isCrossRouteGroupTransition rule, so snapshot capture is no longer needed
// here. Keeping the element marker-free lets the global click capture (also
// gated on the same rule) skip it naturally.
// fumadocs 基础布局渲染的导航栏品牌标题。
// 此前在从 docs 返回首页时捕获过渡快照；该方向现已通过不对称的
// isCrossRouteGroupTransition 规则改用 page-enter（模糊），此处不再需要
// 捕获快照。元素不再带标记，全局 click 捕获（同样受上述规则门控）会自然跳过。

export function NavTitle() {
  return <span className="font-orbitron font-bold text-xl tracking-wider">Neoverse-Doc</span>;
}
